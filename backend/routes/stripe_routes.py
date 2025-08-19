from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from models.database import User, Subscription
from models.schemas import CheckoutRequest, CheckoutResponse
from routes.auth import get_current_user, get_db
from utils.subscription_service import SubscriptionService
import stripe
import os
from typing import Any, Dict, Optional
from datetime import datetime, timedelta
from sqlalchemy import Column, Boolean
import dspy
from dotenv import load_dotenv
from models.schemas import ChangePlanRequest, ChangePlanResponse
from pydantic import BaseModel
import traceback
import logging
import json
import asyncio
from models.database import SubscriptionPlan, UserUsage

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# Model configurations


router = APIRouter(prefix="/api/stripe", tags=["Stripe"])

# Stripe configuration
stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET")

# Make sure PRICE_IDS is defined with all your actual price IDs
PRICE_IDS = {
    'pro_monthly': os.getenv("STRIPE_PRO_MONTHLY_PRICE_ID"),
    'pro_yearly': os.getenv("STRIPE_PRO_YEARLY_PRICE_ID"),
    'max_monthly': os.getenv("STRIPE_MAX_MONTHLY_PRICE_ID"),
    'max_yearly': os.getenv("STRIPE_MAX_YEARLY_PRICE_ID"),
}

# Add a reverse mapping for price ID lookup
def get_plan_from_price_id(price_id: str) -> str:
    """Get plan name from Stripe price ID."""
    plan_mapping = {v: k.split('_')[0] for k, v in PRICE_IDS.items() if v}
    return plan_mapping.get(price_id, 'pro')  # Default to 'pro'

class StripeWebhookError(Exception):
    """Custom exception for Stripe webhook errors."""
    def __init__(self, message: str, event_type: str = None, error_details: str = None):
        self.message = message
        self.event_type = event_type
        self.error_details = error_details
        super().__init__(self.message)

# Add this function for logging webhook events
def log_webhook_event(event_type: str, event_data: dict, success: bool, error_message: str = None):
    """Log webhook events for debugging and monitoring."""
    log_entry = {
        "timestamp": datetime.utcnow().isoformat(),
        "event_type": event_type,
        "success": success,
        "error_message": error_message,
        "event_id": event_data.get("id"),
        "event_created": event_data.get("created"),
        "data_keys": list(event_data.get("data", {}).get("object", {}).keys()) if "data" in event_data else []
    }
    
    print(f"🖨️ Webhook event log: {json.dumps(log_entry, indent=2)}")
    
    # You could also save this to a database or file for monitoring
    return log_entry

# Add this function for retrying failed webhook operations
async def retry_webhook_operation(operation, max_retries: int = 3, delay: float = 1.0):
    """Retry a webhook operation with exponential backoff."""
    for attempt in range(max_retries):
        try:
            return await operation()
        except Exception as e:
            if attempt == max_retries - 1:
                # Last attempt, re-raise the error
                raise
            
            # Wait before retrying with exponential backoff
            wait_time = delay * (2 ** attempt)
            print(f"⚠️ Webhook operation failed (attempt {attempt + 1}/{max_retries}), retrying in {wait_time}s: {e}")
            await asyncio.sleep(wait_time)
    
    # This should never be reached, but just in case
    raise Exception("Max retries exceeded")

# Add this function for validating webhook events
def validate_webhook_event(event: dict) -> bool:
    """Validate that a webhook event has the required structure."""
    required_fields = ['id', 'type', 'data', 'created']
    
    for field in required_fields:
        if field not in event:
            print(f"❌ Missing required field: {field}")
            return False
    
    if 'object' not in event['data']:
        print("❌ Missing 'object' in event data")
        return False
    
    return True

@router.post("/create-checkout-session", response_model=CheckoutResponse)
async def create_checkout_session(
    request: CheckoutRequest,
    current_user: Any = Depends(get_current_user),
    db = Depends(get_db)
):
    """Create Stripe checkout session."""

    plan = request.plan.lower()
    billing_cycle = request.billing_cycle.lower()
    promo_code = request.promo_code  # GET PROMO CODE FROM REQUEST
    
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Validate plan and billing cycle
    if plan not in ['pro', 'max']:
        raise HTTPException(status_code=400, detail="Invalid plan")
    
    if billing_cycle not in ['monthly', 'yearly']:
        raise HTTPException(status_code=400, detail="Invalid billing cycle")
    
    # Get price ID
    price_key = f"{plan}_{billing_cycle}"
    price_id = PRICE_IDS.get(price_key)
    
    if not price_id:
        raise HTTPException(status_code=400, detail="Price ID not configured")
    
    try:
        # FIXED: Use proper frontend URL for success redirect
        frontend_url = os.getenv('FRONTEND_URL', 'http://localhost:3000')
        
        # Build checkout session parameters
        checkout_params = {
            'customer_email': current_user.email,
            'payment_method_types': ['card'],
            'line_items': [{
                'price': price_id,
                'quantity': 1,
            }],
            'mode': 'subscription',
            'success_url': f"{frontend_url}/payment-success?session_id={{CHECKOUT_SESSION_ID}}",
            'cancel_url': f"{frontend_url}/payment-failure",
            'allow_promotion_codes': True,  # ENABLE PROMO CODES
            'metadata': {
                'user_id': current_user.id,
                'plan': plan,
                'billing_cycle': billing_cycle
            }
        }
        
        # If promo code is provided, validate it first
        if promo_code:
            try:
                # Validate promo code exists in Stripe
                promotion_codes = stripe.PromotionCode.list(
                    code=promo_code,
                    active=True
                )
                
                if not promotion_codes.data:
                    raise HTTPException(status_code=400, detail="Invalid or expired promo code")
                
                # Add promo code to checkout session
                checkout_params['promotion_code'] = promo_code
                
            except Exception as e:
                raise HTTPException(status_code=400, detail=f"Failed to validate promo code: {str(e)}")
        
        checkout_session = stripe.checkout.Session.create(**checkout_params)
        
        return {'checkout_url': checkout_session.url}
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# Fix the get_user_subscription function to only access existing attributes
@router.get("/user-subscription")
async def get_user_subscription(
    current_user: Any = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user's subscription details."""
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    try:
        # Get user's subscription
        subscription = db.query(Subscription).filter(
            Subscription.user_id == current_user.id
        ).first()
        
        # Get user's plan details
        plan_name = subscription.plan if subscription else 'free'
        plan = db.query(SubscriptionPlan).filter(
            SubscriptionPlan.name == plan_name
        ).first()
        
        # Get current month's usage
        current_date = datetime.utcnow()
        usage = db.query(UserUsage).filter(
            UserUsage.user_id == current_user.id,
            UserUsage.year == current_date.year,
            UserUsage.month == current_date.month
        ).first()
        
        if not usage:
            usage = UserUsage(
                user_id=current_user.id,
                year=current_date.year,
                month=current_date.month,
                schemas_generated=0,
                competitions_entered=0
            )
        
        # Build response with only existing attributes
        subscription_data = {
            'plan': {
                'name': plan.name if plan else 'free',
                'display_name': plan.display_name if plan else 'Free Plan',
                'limits': {
                    'max_schemas_per_month': plan.max_schemas_per_month if plan else 5,
                    'max_competitions_per_month': plan.max_competitions_per_month if plan else 3
                },
                'features': {
                    'can_download_certificates': plan.can_download_certificates if plan else False,
                    'can_get_master_certificate': plan.can_get_master_certificate if plan else False,
                    'ai_model_tier': plan.ai_model_tier if plan else 'gpt-4o-mini'
                },
                'selected_model_index': subscription.selected_model_index if subscription else 0
            },
            'usage': {
                'schemas_generated': usage.schemas_generated,
                'competitions_entered': usage.competitions_entered
            }
        }
        
        # Add subscription details if they exist (only existing attributes)
        if subscription:
            subscription_data.update({
                'stripe_subscription_id': subscription.stripe_subscription_id,
                'status': subscription.status,
                'cancel_at_period_end': subscription.cancel_at_period_end,
                'current_period_end': subscription.current_period_end.isoformat() if subscription.current_period_end else None
                # Removed stripe_price_id and billing_cycle as they don't exist
            })
        
        return subscription_data
        
    except Exception as e:
        # Return default data on error instead of raising exception
        print(f"Error fetching subscription: {e}")
        return {
            'plan': {
                'name': 'free',
                'display_name': 'Free Plan',
                'limits': {
                    'max_schemas_per_month': 5,
                    'max_competitions_per_month': 3
                },
                'features': {
                    'can_download_certificates': False,
                    'can_get_master_certificate': False,
                    'ai_model_tier': 'gpt-4o-mini'
                },
                'selected_model_index': 0
            },
            'usage': {
                'schemas_generated': 0,
                'competitions_entered': 0
            }
        }

@router.get("/feature-check/{feature}")
async def check_feature_access(
    feature: str,
    current_user: Any = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Check if user can access a specific feature."""
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    service = SubscriptionService(db)
    result = service.can_use_feature(current_user.id, feature)
    
    return result

@router.post("/webhook")
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    """Handle Stripe webhooks."""
    try:
        print("🎯 Webhook received!")

        payload = await request.body()
        sig_header = request.headers.get('stripe-signature')

        print(f"📝 Payload length: {len(payload)}")
        print(f"🔑 Signature header: {sig_header[:20] if sig_header else 'None'}...")

        if not STRIPE_WEBHOOK_SECRET:
            print("❌ STRIPE_WEBHOOK_SECRET not set!")
            raise HTTPException(status_code=500, detail="Webhook secret not configured")

        try:
            event = stripe.Webhook.construct_event(
                payload, sig_header, STRIPE_WEBHOOK_SECRET
            )
            print(f"✅ Event verified: {event['type']}")
        except ValueError as e:
            print(f"❌ Invalid payload: {e}")
            log_webhook_event("invalid_payload", {"id": "unknown"}, False, str(e))
            raise HTTPException(status_code=400, detail="Invalid payload")
        except stripe.error.SignatureVerificationError as e:
            print(f"❌ Invalid signature: {e}")
            log_webhook_event("invalid_signature", {"id": "unknown"}, False, str(e))
            raise HTTPException(status_code=400, detail="Invalid signature")

        # Validate event 
        if not validate_webhook_event(event):
            print("❌ Invalid webhook event structure.")
            log_webhook_event("invalid_event_structure", event, False, "Invalid event structure")
            raise HTTPException(status_code=400, detail="Invalid webhook event structure")

        # Handle the event
        try:
            if event['type'] == 'checkout.session.completed':
                session = event['data']['object']
                await handle_successful_payment(session, db)
                print("✅ Handled checkout.session.completed")
                log_webhook_event(event['type'], event, True)

            elif event['type'] == 'invoice.payment_succeeded':
                invoice = event['data']['object']
                await handle_invoice_payment_succeeded(invoice, db)
                print("✅ Handled invoice.payment_succeeded")
                log_webhook_event(event['type'], event, True)

            elif event['type'] == 'customer.subscription.deleted':
                subscription = event['data']['object']
                await handle_subscription_deleted(subscription, db)
                print("✅ Handled customer.subscription.deleted")
                log_webhook_event(event['type'], event, True)

            elif event['type'] == 'customer.subscription.updated':
                subscription = event['data']['object']
                await handle_subscription_updated(subscription, db)
                print("✅ Handled customer.subscription.updated")
                log_webhook_event(event['type'], event, True)

            elif event['type'] == 'invoice.upcoming':
                invoice = event['data']['object']
                await handle_upcoming_invoice(invoice, db)
                print("✅ Handled invoice.upcoming")
                log_webhook_event(event['type'], event, True)

            elif event['type'] == 'invoice.created':
                invoice = event['data']['object']
                await handle_invoice_created(invoice, db)
                print("✅ Handled invoice.created")
                log_webhook_event(event['type'], event, True)

            elif event['type'] == 'invoice.paid':
                invoice = event['data']['object']
                await handle_invoice_paid(invoice, db)
                print("✅ Handled invoice.paid")
                log_webhook_event(event['type'], event, True)

            else:
                print(f"⚠️ Unhandled event type: {event['type']}")
                log_webhook_event(event['type'], event, False, "Unhandled event type")

        except Exception as e:
            print(f"❌ Error processing event: {e}")
            print(f" Event type: {event['type']}")
            print(f" Event data keys: {list(event['data']['object'].keys()) if 'data' in event and 'object' in event['data'] else 'No data object'}")
            # Log more details about the error
            print(f"📋 Full traceback: {traceback.format_exc()}")
            # Log the failed event
            log_webhook_event(event['type'], event, False, str(e))
            raise HTTPException(status_code=500, detail=f"Error processing event: {str(e)}")

        return {'status': 'success'}

    except Exception as e:
        print(f"❌ Webhook handler error: {e}")
        print(f"📋 Full traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Webhook handler error: {str(e)}")

async def handle_successful_payment(session, db: Session):
    """Handle successful checkout session."""
    async def _process_payment():
        print(f"🎯 Processing checkout.session.completed for session: {session['id']}")

        user_id = session['metadata'].get('user_id')
        plan = session['metadata'].get('plan')

        if not user_id or not plan:
            print(f"❌ Missing metadata: user_id={user_id}, plan={plan}")
            raise ValueError("Missing required metadata")

        print(f"👤 User ID: {user_id}, Plan: {plan}")

        # Get the subscription from Stripe
        if session.get('subscription'):
            stripe_subscription = stripe.Subscription.retrieve(session['subscription'])
            print(f"💳 Stripe subscription retrieved: {stripe_subscription.id}")
        else:
            print("❌ No subscription found in session")
            raise ValueError("No subscription found in checkout session")

        # Find user - try multiple methods
        user = db.query(User).filter(User.id == user_id).first()

        if not user:
            print(f"❌ User not found by ID: {user_id}")

            # Try to find by email from Stripe customer
            if session.get('customer'):
                try:
                    stripe_customer = stripe.Customer.retrieve(session['customer'])
                    customer_email = stripe_customer.email
                    print(f"🔍 Looking for user by email: {customer_email}")

                    user = db.query(User).filter(User.email == customer_email).first()
                    if user:
                        print(f"✅ Found user by email: {customer_email}")
                        # Update user's ID to match the one from metadata
                        user.id = user_id
                        db.commit()
                        print(f"💳 Updated user ID to: {user_id}")
                    else:
                        print(f"❌ User not found by email: {customer_email}")
                        raise ValueError(f"User not found by ID or email: {user_id}")

                except Exception as e:
                    print(f"❌ Error retrieving Stripe customer: {e}")
                    raise ValueError(f"User not found: {user_id}")
            else:
                raise ValueError(f"User not found: {user_id}")

        # Update user's Stripe customer ID if not set
        if not user.stripe_customer_id and session.get('customer'):
            user.stripe_customer_id = session['customer']
            print(f"💳 Updated user's Stripe customer ID: {session['customer']}")

        # Create or update subscription record
        subscription = db.query(Subscription).filter(
            Subscription.user_id == user_id
        ).first()

        # Use Stripe's actual current_period_end
        try:
            current_period_end = safe_timestamp_to_datetime(stripe_subscription.current_period_end)
            print(f"📅 Using Stripe's current_period_end: {current_period_end}")
        except Exception as e:
            print(f"⚠️ Failed to parse Stripe timestamp, using fallback: {e}")
            current_period_end = datetime.utcnow() + timedelta(days=30)

        if subscription:
            print(f"📝 Updating existing subscription: {subscription.id}")
            subscription.stripe_subscription_id = stripe_subscription.id
            subscription.status = stripe_subscription.status
            subscription.plan = plan
            subscription.current_period_end = current_period_end
            subscription.cancel_at_period_end = stripe_subscription.cancel_at_period_end
        else:
            print(f"🆕 Creating new subscription for user: {user_id}")
            subscription = Subscription(
                user_id=user_id,
                stripe_subscription_id=stripe_subscription.id,
                status=stripe_subscription.status,
                plan=plan,
                current_period_end=current_period_end,
                cancel_at_period_end=stripe_subscription.cancel_at_period_end
            )
            db.add(subscription)

        try:
            db.commit()
            print(f"✅ Subscription saved successfully: {subscription.plan}")
        except Exception as e:
            print(f"❌ Database error: {e}")
            db.rollback()
            raise

    # Retry the operation if it fails
    return await retry_webhook_operation(_process_payment)

# Fix for handle_invoice_payment_succeeded function:
async def handle_invoice_payment_succeeded(invoice, db: Session):
    """Handle successful invoice payment (recurring)."""
    print(f"🎯 Processing invoice.payment_succeeded for invoice: {invoice['id']}")

    subscription_id = invoice.get('subscription')
    if not subscription_id:
        print("⚠️ No subscription found in invoice")
        return

    try:
        # Get subscription from Stripe
        stripe_subscription = stripe.Subscription.retrieve(subscription_id)
        customer_id = stripe_subscription.customer

        # Get customer details from Stripe
        stripe_customer = stripe.Customer.retrieve(customer_id)
        customer_email = stripe_customer.email

        print(f"🔍 Looking for customer: {customer_id}, email: {customer_email}")

        # Try to find user by customer ID first
        user = db.query(User).filter(User.stripe_customer_id == customer_id).first()

        if not user:
            print(f"❌ User not found by customer ID: {customer_id}")
            # Try to find by email
            user = db.query(User).filter(User.email == customer_email).first()
            if user:
                print(f"✅ Found user by email: {customer_email}")
                # Update user's stripe_customer_id
                user.stripe_customer_id = customer_id
                db.commit()
                print(f"💳 Updated user's Stripe customer ID: {customer_id}")
            else:
                print(f"❌ User not found by email: {customer_email}")
                # Optionally, create a new user record here if your business logic allows
                # For now, just log and return
                print(f"❌ Cannot process invoice.payment_succeeded: No matching user for Stripe customer {customer_id} or email {customer_email}")
                return

        # Find or create subscription
        subscription = db.query(Subscription).filter(
            Subscription.stripe_subscription_id == subscription_id
        ).first()

        if not subscription:
            print(f"❌ No local subscription found for: {subscription_id}")
            # Optionally, create a new subscription record here if your business logic allows
            # For now, just log and return
            print(f"❌ Cannot process invoice.payment_succeeded: No matching subscription for Stripe subscription {subscription_id}")
            return

        # FIXED: Use Stripe's actual current_period_end instead of fixed calculation
        try:
            current_period_end = safe_timestamp_to_datetime(stripe_subscription.current_period_end)
            print(f"📅 Using Stripe's current_period_end: {current_period_end}")
        except Exception as e:
            print(f"⚠️ Failed to parse Stripe timestamp, using fallback: {e}")
            current_period_end = datetime.utcnow() + timedelta(days=30)

        # Update subscription with new period
        subscription.current_period_end = current_period_end
        subscription.status = 'active'
        subscription.updated_at = datetime.utcnow()

        db.commit()
        print(f"✅ Updated subscription period end to: {current_period_end}")

    except Exception as e:
        print(f"❌ Error in handle_invoice_payment_succeeded: {e}")
        db.rollback()
        raise

async def create_missing_subscription(user: User, stripe_subscription, customer_id: str, db: Session):
    """Create a missing subscription from Stripe data."""
    try:
        # Update user's customer ID if missing
        if not user.stripe_customer_id:
            user.stripe_customer_id = customer_id
        
        # Determine plan from Stripe subscription
        plan = 'pro'  # Default fallback
        if stripe_subscription.items.data:
            price_id = stripe_subscription.items.data[0].price.id
            plan_mapping = {v: k.split('_')[0] for k, v in PRICE_IDS.items() if v}
            plan = plan_mapping.get(price_id, 'pro')
        
        # Use safe timestamp conversion
        current_period_end = safe_timestamp_to_datetime(
            getattr(stripe_subscription, 'current_period_end', None)
        )
        
        # Create new subscription
        subscription = Subscription(
            user_id=user.id,
            stripe_subscription_id=stripe_subscription.id,
            status=stripe_subscription.status,
            plan=plan,
            current_period_end=current_period_end,
            cancel_at_period_end=getattr(stripe_subscription, 'cancel_at_period_end', False)
        )
        
        db.add(subscription)
        db.commit()
        
        print(f"✅ RECOVERY: Created missing subscription for {user.email} - Plan: {plan}")
        
    except Exception as e:
        print(f"❌ RECOVERY FAILED: {e}")
        db.rollback()
        raise

async def handle_subscription_deleted(stripe_subscription, db: Session):
    """Handle subscription cancellation."""
    subscription = db.query(Subscription).filter(
        Subscription.stripe_subscription_id == stripe_subscription['id']
    ).first()
    
    if subscription:
        subscription.status = 'canceled'
        db.commit()

# Fix for handle_subscription_updated function:
async def handle_subscription_updated(stripe_subscription, db: Session):
    """Handle subscription updates (plan changes, etc.)."""
    print(f"🔄 Processing subscription update: {stripe_subscription['id']}")
    
    subscription = db.query(Subscription).filter(
        Subscription.stripe_subscription_id == stripe_subscription['id']
    ).first()
    
    if not subscription:
        print(f"❌ No local subscription found for: {stripe_subscription['id']}")
        return
    
    try:
        # Update subscription details
        subscription.status = stripe_subscription['status']
        
        # FIXED: Use Stripe's actual current_period_end instead of fixed calculation
        try:
            current_period_end = safe_timestamp_to_datetime(stripe_subscription.get('current_period_end'))
            print(f"📅 Using Stripe's current_period_end: {current_period_end}")
        except Exception as e:
            print(f"⚠️ Failed to parse Stripe timestamp, using fallback: {e}")
            current_period_end = datetime.utcnow() + timedelta(days=30)
        
        subscription.current_period_end = current_period_end
        subscription.updated_at = datetime.utcnow()
        
        db.commit()
        print(f"✅ Updated subscription: {subscription.id}")
        
    except Exception as e:
        print(f"❌ Error updating subscription: {e}")
        db.rollback()
        raise

async def handle_upcoming_invoice(invoice, db: Session):
    """Handle upcoming invoice notifications."""
    print(f"📧 Upcoming invoice: {invoice['id']}")
    # You could send email notifications here
    # or update UI to show upcoming charges

async def handle_invoice_created(invoice, db: Session):
    """Handle invoice creation."""
    print(f"📄 Invoice created: {invoice['id']}")
    # Log invoice creation - you can add email notifications here
    return

async def handle_invoice_paid(invoice, db: Session):
    """Handle invoice paid event."""
    print(f"💰 Invoice paid: {invoice['id']}")
    # This is similar to payment_succeeded but specifically for paid status
    await handle_invoice_payment_succeeded(invoice, db)

@router.post("/cancel-subscription")
async def cancel_subscription(
    current_user: Any = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Cancel user's subscription at period end."""
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    try:
        # Find user's subscription
        subscription = db.query(Subscription).filter(
            Subscription.user_id == current_user.id
        ).first()
        
        if not subscription or not subscription.stripe_subscription_id:
            raise HTTPException(status_code=400, detail="No active subscription found")
        
        # Cancel subscription in Stripe
        stripe_subscription = stripe.Subscription.modify(
            subscription.stripe_subscription_id,
            cancel_at_period_end=True
        )
        
        # Update local database
        subscription.cancel_at_period_end = True
        subscription.status = 'active'  # Keep active until period end
        db.commit()
        
        return {
            "success": True,
            "message": f"Your subscription will be canceled at the end of your current billing period ({subscription.current_period_end.strftime('%B %d, %Y')}). You'll continue to have access until then.",
            "cancel_at_period_end": True,
            "current_period_end": subscription.current_period_end.isoformat()
        }
        
    except Exception as e:
        print(f"❌ Error canceling subscription: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to cancel subscription: {str(e)}")

@router.post("/reactivate-subscription")
async def reactivate_subscription(
    current_user: Any = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Reactivate a subscription that was set to cancel."""
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    try:
        # Find user's subscription
        subscription = db.query(Subscription).filter(
            Subscription.user_id == current_user.id
        ).first()
        
        if not subscription or not subscription.stripe_subscription_id:
            raise HTTPException(status_code=400, detail="No subscription found")
        
        if not subscription.cancel_at_period_end:
            raise HTTPException(status_code=400, detail="Subscription is not set to cancel")
        
        # Reactivate subscription in Stripe
        stripe_subscription = stripe.Subscription.modify(
            subscription.stripe_subscription_id,
            cancel_at_period_end=False
        )
        
        # Update local database
        subscription.cancel_at_period_end = False
        db.commit()
        
        return {
            "success": True,
            "message": "Your subscription has been reactivated successfully!",
            "cancel_at_period_end": False
        }
        
    except Exception as e:
        print(f"❌ Error reactivating subscription: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to reactivate subscription: {str(e)}")

@router.post("/refresh-subscription")
async def refresh_subscription(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Manually refresh subscription status from Stripe."""
    print(f"🔄 Refreshing subscription for user: {current_user.id}")
    
    subscription = db.query(Subscription).filter(
        Subscription.user_id == current_user.id
    ).first()
    
    if not subscription or not subscription.stripe_subscription_id:
        return {"status": "no_subscription"}
    
    try:
        # Get latest from Stripe
        stripe_subscription = stripe.Subscription.retrieve(subscription.stripe_subscription_id)
        
        # Update local record with proper error handling
        subscription.status = stripe_subscription.status
        subscription.cancel_at_period_end = stripe_subscription.cancel_at_period_end
        
        # Fix: Proper timestamp conversion
        try:
            subscription.current_period_end = datetime.fromtimestamp(stripe_subscription.current_period_end)
        except (TypeError, ValueError) as e:
            print(f"❌ Error converting current_period_end in refresh: {e}")
            # Keep existing value if conversion fails
            pass
        
        db.commit()
        
        service = SubscriptionService(db)
        user_subscription = service.get_user_subscription(current_user.id)
        
        print(f"✅ Subscription refreshed: {user_subscription}")
        return user_subscription
        
    except Exception as e:
        print(f"❌ Error refreshing subscription: {e}")
        raise HTTPException(status_code=500, detail="Failed to refresh subscription")

@router.post("/change-plan")
async def change_plan(
    request: ChangePlanRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Change user's subscription plan with proper proration."""
    print(f"🔄 Plan change requested: {current_user.id} -> {request.new_plan}")
    
    subscription = db.query(Subscription).filter(
        Subscription.user_id == current_user.id
    ).first()
    
    if not subscription or not subscription.stripe_subscription_id:
        raise HTTPException(status_code=400, detail="No active subscription found")
    
    current_plan = subscription.plan
    new_plan = request.new_plan
    
    # Handle downgrade to free (cancel subscription)
    if new_plan == 'free':
        return await handle_downgrade_to_free(subscription, db)
    
    # Handle upgrade/downgrade between paid plans
    if current_plan == 'free':
        # Free to paid - create new subscription
        return await handle_upgrade_from_free(new_plan, request.billing_cycle, current_user, db)
    else:
        # Paid to paid - modify existing subscription
        return await handle_plan_change(subscription, new_plan, request.billing_cycle, db)

async def handle_downgrade_to_free(subscription: Subscription, db: Session):
    """Handle downgrade to free plan."""
    try:
        # Cancel subscription at period end
        stripe_subscription = stripe.Subscription.modify(
            subscription.stripe_subscription_id,
            cancel_at_period_end=True
        )
        
        # Update local record
        subscription.cancel_at_period_end = True
        subscription.status = stripe_subscription.status
        db.commit()
        
        return ChangePlanResponse(
            success=True,
            message=f"Your subscription will be canceled at the end of your current billing period ({subscription.current_period_end.strftime('%B %d, %Y')}). You'll continue to have access until then.",
            effective_date=subscription.current_period_end.isoformat(),
            next_billing_amount=0.0,
            plan_changed_to="free"
        )
        
    except Exception as e:
        print(f"❌ Error downgrading to free: {e}")
        raise HTTPException(status_code=500, detail="Failed to process downgrade")

async def handle_upgrade_from_free(new_plan: str, billing_cycle: str, current_user: User, db: Session):
    """Handle upgrade from free to paid plan."""
    # This would redirect to checkout - similar to initial subscription
    price_key = f"{new_plan}_{billing_cycle}"
    price_id = PRICE_IDS.get(price_key)
    
    if not price_id:
        raise HTTPException(status_code=400, detail="Invalid plan or billing cycle")
    
    return {
        "success": False,
        "redirect_to_checkout": True,
        "message": "Please complete the checkout process to upgrade your plan",
        "checkout_url": f"/api/stripe/create-checkout-session"  # You'd call this endpoint
    }

async def handle_plan_change(subscription: Subscription, new_plan: str, billing_cycle: str, db: Session):
    """Handle plan change between paid plans."""
    try:
        # Get current Stripe subscription
        stripe_subscription = stripe.Subscription.retrieve(subscription.stripe_subscription_id)
        
        # Get new price ID
        price_key = f"{new_plan}_{billing_cycle}"
        new_price_id = PRICE_IDS.get(price_key)
        
        if not new_price_id:
            raise HTTPException(status_code=400, detail="Invalid plan or billing cycle")
        
        current_plan = subscription.plan
        
        # Calculate if this is an upgrade or downgrade
        plan_hierarchy = {'free': 0, 'pro': 1, 'max': 2}
        is_upgrade = plan_hierarchy.get(new_plan, 0) > plan_hierarchy.get(current_plan, 0)
        
        if is_upgrade:
            # Immediate upgrade with proration
            updated_subscription = stripe.Subscription.modify(
                subscription.stripe_subscription_id,
                items=[{
                    'id': stripe_subscription['items']['data'][0]['id'],
                    'price': new_price_id,
                }],
                proration_behavior='create_prorations',  # Charge immediately for upgrade
            )
            effective_message = "Your plan has been upgraded immediately."
            effective_date = datetime.now().isoformat()
            
        else:
            # Downgrade at period end to avoid refunds
            updated_subscription = stripe.Subscription.modify(
                subscription.stripe_subscription_id,
                items=[{
                    'id': stripe_subscription['items']['data'][0]['id'],
                    'price': new_price_id,
                }],
                proration_behavior='none',  # No proration for downgrades
                billing_cycle_anchor='unchanged'  # Keep current billing cycle
            )
            effective_message = f"Your plan will be downgraded at the end of your current billing period ({subscription.current_period_end.strftime('%B %d, %Y')})."
            effective_date = subscription.current_period_end.isoformat()
        
        # Update local subscription
        subscription.plan = new_plan
        subscription.status = updated_subscription.status
        db.commit()
        
        # Get pricing info
        new_price = stripe.Price.retrieve(new_price_id)
        next_billing_amount = new_price.unit_amount / 100  # Convert cents to dollars
        
        return ChangePlanResponse(
            success=True,
            message=effective_message,
            effective_date=effective_date,
            next_billing_amount=next_billing_amount,
            plan_changed_to=new_plan
        )
        
    except Exception as e:
        print(f"❌ Error changing plan: {e}")
        raise HTTPException(status_code=500, detail="Failed to change plan")

@router.get("/plan-change-preview")
async def get_plan_change_preview(
    new_plan: str,
    billing_cycle: str = 'monthly',
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get preview of plan change including proration details."""
    subscription = db.query(Subscription).filter(
        Subscription.user_id == current_user.id
    ).first()
    
    if not subscription:
        raise HTTPException(status_code=400, detail="No subscription found")
    
    current_plan = subscription.plan
    
    # Get pricing info
    price_key = f"{new_plan}_{billing_cycle}"
    new_price_id = PRICE_IDS.get(price_key)
    
    if not new_price_id:
        raise HTTPException(status_code=400, detail="Invalid plan")
    
    new_price = stripe.Price.retrieve(new_price_id)
    new_amount = new_price.unit_amount / 100
    
    plan_hierarchy = {'free': 0, 'pro': 1, 'max': 2}
    is_upgrade = plan_hierarchy.get(new_plan, 0) > plan_hierarchy.get(current_plan, 0)
    
    if new_plan == 'free':
        return {
            "current_plan": current_plan,
            "new_plan": new_plan,
            "is_upgrade": False,
            "effective_immediately": False,
            "effective_date": subscription.current_period_end.isoformat(),
            "proration_amount": 0,
            "next_billing_amount": 0,
            "message": "Your subscription will be canceled at the end of the current billing period."
        }
    
    try:
        # Get proration preview from Stripe
        upcoming_invoice = stripe.Invoice.upcoming(
            customer=subscription.user.stripe_customer_id,
            subscription=subscription.stripe_subscription_id,
            subscription_items=[{
                'id': stripe.Subscription.retrieve(subscription.stripe_subscription_id)['items']['data'][0]['id'],
                'price': new_price_id,
            }],
            proration_behavior='create_prorations' if is_upgrade else 'none'
        )
        
        proration_amount = upcoming_invoice.amount_due / 100 if upcoming_invoice.amount_due > 0 else 0
        
        return {
            "current_plan": current_plan,
            "new_plan": new_plan,
            "is_upgrade": is_upgrade,
            "effective_immediately": is_upgrade,
            "effective_date": datetime.now().isoformat() if is_upgrade else subscription.current_period_end.isoformat(),
            "proration_amount": proration_amount,
            "next_billing_amount": new_amount,
            "message": f"{'Upgrade' if is_upgrade else 'Downgrade'} to {new_plan.upper()} plan"
        }
        
    except Exception as e:
        print(f"❌ Error getting preview: {e}")
        return {
            "current_plan": current_plan,
            "new_plan": new_plan,
            "is_upgrade": is_upgrade,
            "effective_immediately": is_upgrade,
            "effective_date": datetime.now().isoformat() if is_upgrade else subscription.current_period_end.isoformat(),
            "proration_amount": 0,
            "next_billing_amount": new_amount,
            "message": f"{'Upgrade' if is_upgrade else 'Downgrade'} to {new_plan.upper()} plan"
        }

@router.post("/sync-stripe-customer")
async def sync_stripe_customer(
    customer_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Manually sync a Stripe customer with local user."""
    try:
        # Verify customer belongs to this user
        stripe_customer = stripe.Customer.retrieve(customer_id)
        
        if stripe_customer.email != current_user.email:
            raise HTTPException(status_code=400, detail="Customer email doesn't match user email")
        
        # Update user's customer ID
        current_user.stripe_customer_id = customer_id
        
        # Get customer's subscriptions
        subscriptions = stripe.Subscription.list(customer=customer_id, status='all')
        
        for stripe_sub in subscriptions.data:
            # Check if subscription already exists locally
            existing_sub = db.query(Subscription).filter(
                Subscription.stripe_subscription_id == stripe_sub.id
            ).first()
            
            if not existing_sub:
                # Create missing subscription
                await create_missing_subscription(current_user, stripe_sub, customer_id, db)
        
        db.commit()
        return {"status": "success", "message": "Customer synced successfully"}
        
    except Exception as e:
        print(f"❌ Error syncing customer: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to sync customer: {str(e)}")

@router.get("/debug-stripe-status")
async def debug_stripe_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Debug endpoint to check Stripe sync status."""
    try:
        local_subscription = db.query(Subscription).filter(
            Subscription.user_id == current_user.id
        ).first()
        
        result = {
            "user_email": current_user.email,
            "user_stripe_customer_id": current_user.stripe_customer_id,
            "local_subscription_exists": bool(local_subscription),
            "local_subscription_details": None,
            "stripe_customer_data": None,
            "stripe_subscriptions": []
        }
        
        if local_subscription:
            result["local_subscription_details"] = {
                "stripe_subscription_id": local_subscription.stripe_subscription_id,
                "plan": local_subscription.plan,
                "status": local_subscription.status,
                "current_period_end": local_subscription.current_period_end.isoformat() if local_subscription.current_period_end else None
            }
        
        # Get Stripe data if customer ID exists
        if current_user.stripe_customer_id:
            try:
                stripe_customer = stripe.Customer.retrieve(current_user.stripe_customer_id)
                result["stripe_customer_data"] = {
                    "id": stripe_customer.id,
                    "email": stripe_customer.email,
                    "created": stripe_customer.created
                }
                
                # Get subscriptions
                subscriptions = stripe.Subscription.list(customer=current_user.stripe_customer_id)
                result["stripe_subscriptions"] = [
                    {
                        "id": sub.id,
                        "status": sub.status,
                        "current_period_end": sub.current_period_end,
                        "plan": get_plan_from_price_id(sub.items.data[0].price.id) if sub.items.data else "unknown"
                    }
                    for sub in subscriptions.data
                ]
            except Exception as e:
                result["stripe_error"] = str(e)
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

def safe_timestamp_to_datetime(timestamp, fallback_days=30):
    """Safely convert a Unix timestamp to datetime with fallback."""
    try:
        if timestamp is None:
            print("⚠️ Timestamp is None, using fallback")
            raise ValueError("Timestamp is None")
        
        # Handle both integer and string timestamps
        if isinstance(timestamp, str):
            timestamp = float(timestamp)
        
        # Validate timestamp is reasonable (not too old or too far in future)
        current_time = datetime.now().timestamp()
        if timestamp < current_time - (365 * 24 * 3600):  # More than 1 year ago
            print(f"⚠️ Timestamp {timestamp} is too old, using fallback")
            raise ValueError("Timestamp too old")
        
        if timestamp > current_time + (365 * 24 * 3600):  # More than 1 year in future
            print(f"⚠️ Timestamp {timestamp} is too far in future, using fallback")
            raise ValueError("Timestamp too far in future")
        
        result = datetime.fromtimestamp(timestamp)
        print(f"✅ Successfully converted timestamp {timestamp} to {result}")
        return result
        
    except (TypeError, ValueError, OSError) as e:
        print(f"⚠️ Failed to convert timestamp {timestamp}: {e}")
        fallback = datetime.now() + timedelta(days=fallback_days)
        print(f"🔄 Using fallback date: {fallback}")
        return fallback

@router.post("/validate-promo-code")
async def validate_promo_code(
    request: Request,
    current_user: Any = Depends(get_current_user)
):
    """Validate a promo code."""
    try:
        body = await request.json()
        promo_code = body.get('promo_code')
        
        if not promo_code:
            raise HTTPException(status_code=400, detail="Promo code is required")
        
        # Check if promo code exists in Stripe
        promotion_codes = stripe.PromotionCode.list(
            code=promo_code,
            active=True
        )
        
        if not promotion_codes.data:
            raise HTTPException(status_code=400, detail="Invalid or expired promo code")
        
        promo_code_obj = promotion_codes.data[0]
        
        return {
            "valid": True,
            "discount_type": "percentage" if promo_code_obj.coupon.percent_off else "amount",
            "discount_value": promo_code_obj.coupon.percent_off or promo_code_obj.coupon.amount_off,
            "currency": promo_code_obj.coupon.currency,
            "description": promo_code_obj.coupon.name
        }
        
    except Exception as e:
        print(f"❌ Error validating promo code: {e}")
        raise HTTPException(status_code=400, detail="Failed to validate promo code")

@router.get("/subscription-status")
async def get_subscription_status(
    current_user: Any = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get detailed subscription status including cancellation info."""
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    try:
        subscription = db.query(Subscription).filter(
            Subscription.user_id == current_user.id
        ).first()
        
        if not subscription:
            return {
                "has_subscription": False,
                "plan": "free",
                "status": "no_subscription"
            }
        
        return {
            "has_subscription": True,
            "plan": subscription.plan,
            "status": subscription.status,
            "cancel_at_period_end": subscription.cancel_at_period_end,
            "current_period_end": subscription.current_period_end.isoformat() if subscription.current_period_end else None,
            "stripe_subscription_id": subscription.stripe_subscription_id
        }
        
    except Exception as e:
        print(f"❌ Error getting subscription status: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get subscription status: {str(e)}")

@router.get("/verify-checkout-session/{session_id}")
async def verify_checkout_session(session_id: str):
    """Verify a Stripe checkout session by ID and return payment details."""
    try:
        # Retrieve the checkout session from Stripe
        checkout_session = stripe.checkout.Session.retrieve(session_id)
        
        # Check if the session is completed and paid
        if checkout_session.payment_status == 'paid' and checkout_session.status == 'complete':
            # Get subscription details if available
            subscription_id = checkout_session.subscription
            subscription_details = None
            
            if subscription_id:
                try:
                    subscription = stripe.Subscription.retrieve(subscription_id)
                    
                    # Safely get the plan from subscription items
                    plan_name = None
                    if hasattr(subscription, 'items') and subscription.items:
                        # Get the first item's price lookup key
                        if hasattr(subscription.items, 'data') and subscription.items.data:
                            first_item = subscription.items.data[0]
                            if hasattr(first_item, 'price') and first_item.price:
                                plan_name = getattr(first_item.price, 'lookup_key', None)
                    
                    # Fallback: try to get plan from metadata or other sources
                    if not plan_name:
                        # Check if we have metadata with plan info
                        if hasattr(checkout_session, 'metadata') and checkout_session.metadata:
                            plan_name = checkout_session.metadata.get('plan')
                    
                    subscription_details = {
                        "id": subscription.id,
                        "status": subscription.status,
                        "plan": plan_name,
                        "current_period_end": subscription.current_period_end,
                        "cancel_at_period_end": subscription.cancel_at_period_end
                    }
                except Exception as e:
                    print(f"Warning: Could not retrieve subscription {subscription_id}: {e}")
                    # Try to get basic info from checkout session metadata
                    subscription_details = {
                        "id": subscription_id,
                        "status": "unknown",
                        "plan": checkout_session.metadata.get('plan') if checkout_session.metadata else None,
                        "current_period_end": None,
                        "cancel_at_period_end": False
                    }
            
            return {
                "success": True,
                "session_id": session_id,
                "payment_status": checkout_session.payment_status,
                "status": checkout_session.status,
                "amount_total": checkout_session.amount_total,
                "currency": checkout_session.currency,
                "customer_email": checkout_session.customer_details.email if checkout_session.customer_details else None,
                "subscription": subscription_details,
                "metadata": checkout_session.metadata
            }
        else:
            return {
                "success": False,
                "session_id": session_id,
                "payment_status": checkout_session.payment_status,
                "status": checkout_session.status,
                "error": "Payment not completed"
            }
            
    except stripe.error.InvalidRequestError:
        return {
            "success": False,
            "session_id": session_id,
            "error": "Invalid session ID"
        }
    except Exception as e:
        return {
            "success": False,
            "session_id": session_id,
            "error": f"Failed to verify session: {str(e)}"
        }


