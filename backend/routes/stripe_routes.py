from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from models.database import User, Subscription
from models.schemas import CheckoutRequest, CheckoutResponse
from routes.auth import get_current_user, get_db
from utils.subscription_service import SubscriptionService
import stripe
import os
from typing import Any, Dict, Optional
from datetime import datetime
from sqlalchemy import Column, Boolean

router = APIRouter(prefix="/api/stripe", tags=["Stripe"])

# Stripe configuration
stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET")

PRICE_IDS = {
    'pro_monthly': os.getenv("STRIPE_PRO_MONTHLY_PRICE_ID"),
    'pro_yearly': os.getenv("STRIPE_PRO_YEARLY_PRICE_ID"),
    'max_monthly': os.getenv("STRIPE_MAX_MONTHLY_PRICE_ID"),
    'max_yearly': os.getenv("STRIPE_MAX_YEARLY_PRICE_ID"),
}

@router.post("/create-checkout-session", response_model = CheckoutResponse)
async def create_checkout_session(
    request: CheckoutRequest,

    current_user: Any = Depends(get_current_user),
    db = Depends(get_db)
):
    
    """Create Stripe checkout session."""

    plan = request.plan.lower()
    billing_cycle = request.billing_cycle.lower()
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
        checkout_session = stripe.checkout.Session.create(
            customer_email=current_user.email,
            payment_method_types=['card'],
            line_items=[{
                'price': price_id,
                'quantity': 1,
            }],
            mode='subscription',
            success_url=f"{os.getenv('FRONTEND_URL')}/subscription/success?session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{os.getenv('FRONTEND_URL')}/pricing",
            metadata={
                'user_id': current_user.id,
                'plan': plan,
                'billing_cycle': billing_cycle
            }
        )
        
        return {'checkout_url': checkout_session.url}
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/user-subscription")
async def get_user_subscription(
    current_user: Any = Depends(get_current_user),
    db = Depends(get_db)
):
    """Get user's current subscription details."""
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    try:
        service = SubscriptionService(db)
        plan = service.get_user_plan(current_user.id)
        usage = service.get_user_usage(current_user.id)
        return {
            'plan': plan,
            'usage': usage
        }
    except Exception as e:
        usage = {
            'schemas_generated': 0,
            'competitions_entered': 0
        }
        # return {'plan':os.environ('SET_MY_DEFAULT_PLAN'), 'usage':usage}
        raise HTTPException(status_code=500, detail=f"Failed to fetch subscription: {str(e)}")

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
    payload = await request.body()
    sig_header = request.headers.get('stripe-signature')
    
    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, STRIPE_WEBHOOK_SECRET
        )
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.error.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid signature")
    
    # Handle the event
    if event['type'] == 'checkout.session.completed':
        session = event['data']['object']
        await handle_successful_payment(session, db)
    
    elif event['type'] == 'invoice.payment_succeeded':
        invoice = event['data']['object']
        await handle_invoice_payment_succeeded(invoice, db)
    
    elif event['type'] == 'customer.subscription.deleted':
        subscription = event['data']['object']
        await handle_subscription_deleted(subscription, db)
    
    return {'status': 'success'}

async def handle_successful_payment(session, db: Session):
    """Handle successful checkout session."""
    user_id = session['metadata']['user_id']
    plan = session['metadata']['plan']
    
    # Get the subscription from Stripe
    stripe_subscription = stripe.Subscription.retrieve(session['subscription'])
    
    # Create or update subscription record
    subscription = db.query(Subscription).filter(
        Subscription.user_id == user_id
    ).first()
    
    if subscription:
        subscription.stripe_subscription_id = stripe_subscription.id
        subscription.status = stripe_subscription.status
        subscription.plan = plan
        subscription.current_period_end = datetime.fromtimestamp(stripe_subscription.current_period_end)
    else:
        subscription = Subscription(
            user_id=user_id,
            stripe_subscription_id=stripe_subscription.id,
            status=stripe_subscription.status,
            plan=plan,
            current_period_end=datetime.fromtimestamp(stripe_subscription.current_period_end)
        )
        db.add(subscription)
    
    db.commit()

async def handle_invoice_payment_succeeded(invoice, db: Session):
    """Handle successful invoice payment (renewals)."""
    stripe_subscription_id = invoice['subscription']
    
    subscription = db.query(Subscription).filter(
        Subscription.stripe_subscription_id == stripe_subscription_id
    ).first()
    
    if subscription:
        stripe_subscription = stripe.Subscription.retrieve(stripe_subscription_id)
        subscription.current_period_end = datetime.fromtimestamp(stripe_subscription.current_period_end)
        subscription.status = stripe_subscription.status
        db.commit()

async def handle_subscription_deleted(stripe_subscription, db: Session):
    """Handle subscription cancellation."""
    subscription = db.query(Subscription).filter(
        Subscription.stripe_subscription_id == stripe_subscription['id']
    ).first()
    
    if subscription:
        subscription.status = 'canceled'
        db.commit()

@router.post("/cancel-subscription")
async def cancel_subscription(
    current_user: Any = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Cancel user's subscription at period end."""
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    try:
        service = SubscriptionService(db)
        result = service.cancel_subscription(current_user.id)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to cancel subscription")

@router.post("/reactivate-subscription")
async def reactivate_subscription(
    current_user: Any = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Reactivate a subscription that was set to cancel."""
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    try:
        service = SubscriptionService(db)
        result = service.reactivate_subscription(current_user.id)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to reactivate subscription")
