"""
Authentication routes for SQL Tutor AI backend.
Handles Google OAuth and user session management.
"""

from fastapi import APIRouter, HTTPException, Depends, status, Request, Body
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Dict, Any, Optional
import os

from models.schemas import GoogleAuthRequest, UserResponse, SuccessResponse
from utils.auth import verify_google_token, create_access_token, get_user_from_token
from utils.subscription_service import SubscriptionService

from models import User
from models import SessionLocal
from models.database import Subscription
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
from datetime import datetime, timedelta
import requests
import dspy

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

# NOTE: Set auto_error=False so endpoints can be accessed without credentials (for debugging)
security = HTTPBearer(auto_error=False)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
AI_MODELS = {
    'free': {
        'provider': 'openai',
        'name': 'gpt-4o-mini',
        'max_tokens': 5000,
        'api_key_env': 'OPENAI_API_KEY'
    },
    'pro': [
        {
            'provider': 'openai',
            'name': 'gpt-5',
            'max_tokens': 4000,
            'api_key_env': 'OPENAI_API_KEY',
            'temperature': 1
        },
        {
            'provider': 'anthropic',
            'name': 'claude-3-5-sonnet',
            'max_tokens': 3000,
            'api_key_env': 'ANTHROPIC_API_KEY',
            'temperature': 0.4
        },
        {
            'provider': 'gemini',
            'name': 'gemini-2.5-pro',
            'max_tokens': 3000,
            'api_key_env': 'GEMINI_API_KEY',
              'temperature': 0.5
        }
    ],
    'max': [
        {
            'provider': 'openai',
            'name': 'gpt-5',
            'max_tokens': 4000,
            'api_key_env': 'OPENAI_API_KEY',
            'temperature': 1
        },
        {
            'provider': 'anthropic',
            'name': 'claude-3-5-sonnet',
            'max_tokens': 6000,
            'api_key_env': 'ANTHROPIC_API_KEY',
            'temperature': 0.4
        },
        {
            'provider': 'gemini',
            'name': 'gemini-2.5-pro',
            'max_tokens': 7000,
            'api_key_env': 'GEMINI_API_KEY',
              'temperature': 0.5
        }
    ]
}



@router.get("/available")
async def get_available_models(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db)
):
    """
    Get available AI models for the current user (free models always available).
    Returns a list of available models and the user's current model.
    """
    # Always include free model(s)
    available_models = [{
        "name": AI_MODELS['free']['name'],
        "description": "OpenAI GPT-4o Mini (free tier)",
        "premium": False
    }]
    current_model = AI_MODELS['free']['name']
    selected_model_index = 0
    plan_name = 'free'

    # Try to get user plan if authenticated
    if credentials and credentials.credentials:
        try:
            token = credentials.credentials
            user = get_user_from_token(token)
            user_id = user.get("id")
            if user_id:
                subscription_service = SubscriptionService(db)
                user_plan = subscription_service.get_user_plan(user_id)
                plan_name = user_plan.get('name', 'free')
                selected_model_index = user_plan.get('selected_model_index', 0)
        except Exception:
            pass  # fallback to free

    # Add premium models for all users (but mark them as premium)
    max_models = AI_MODELS['max']  # Show all available models
    for model in max_models:
        available_models.append({
            "name": model['name'],
            "description": f"{model['provider'].capitalize()} {model['name']}",
            "premium": True
        })

    # Set current model based on user's plan and selection
    if plan_name in ('pro', 'max'):
        plan_models = AI_MODELS[plan_name]
        if selected_model_index < len(plan_models):
            current_model = plan_models[selected_model_index]['name']

    return {
        "available_models": available_models,
        "current_model": current_model,
        "user_plan": plan_name  # Add this to help frontend know user's plan
    }

def get_model_for_user(user_id: str, db) -> dspy.LM:
    """Get the appropriate model based on user's subscription and their selected model."""
    subscription_service = SubscriptionService(db)
    user_plan = subscription_service.get_user_plan(user_id)
    plan_name = user_plan.get('name', 'free')
    
    # Get user's selected model from their preferences (you'll need to add this to your database)
    selected_model_index = user_plan.get('selected_model_index', 0)
    
    if plan_name == 'free':
        model_config = AI_MODELS['free']
    else:
        available_models = AI_MODELS[plan_name]
        model_config = available_models[selected_model_index % len(available_models)]
    
    api_key = os.getenv(model_config['api_key_env'])
    if not api_key:
        # Fallback to free model if API key not found
        model_config = AI_MODELS['free']
        api_key = os.getenv(model_config['api_key_env'])
    if 'gpt-5' in model_config['name']:
        return dspy.LM(
            model=f"{model_config['provider']}/{model_config['name']}", 
            api_key=api_key,
            max_tokens=None,
            max_completion_tokens=model_config['max_tokens'],
            temperature=1
        )
    else:
        return dspy.LM(
            model=f"{model_config['provider']}/{model_config['name']}", 
            api_key=api_key,
            max_tokens=model_config['max_tokens'],
            temperature=1
        )

# Default model for non-authenticated routes
default_lm = dspy.LM(
    model=f"{AI_MODELS['free']['provider']}/{AI_MODELS['free']['name']}", 
    api_key=os.getenv(AI_MODELS['free']['api_key_env']),
    max_tokens=AI_MODELS['free']['max_tokens']

)
dspy.settings.configure(lm=default_lm)

async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db)
):
    """
    Dependency to get current authenticated user.
    Accepts either:
      - App JWT issued by this backend (preferred)
      - Google access token (fallback): will be validated via Google UserInfo
    """
    if not credentials or not credentials.credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing authentication credentials")
    token = credentials.credentials
    # 1) Try our own JWT first
    try:
        payload = get_user_from_token(token)
        user_id = payload.get("id")
        if not user_id:
            raise ValueError("Missing id in JWT payload")
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
        return user
    except Exception:
        # 2) Fallback: treat token as Google access token
        try:
            resp = requests.get(
                "https://www.googleapis.com/oauth2/v2/userinfo",
                headers={"Authorization": f"Bearer {token}"},
                timeout=5
            )
            if resp.status_code != 200:
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
            info = resp.json()
            google_id = info.get("id") or info.get("sub")
            if not google_id:
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Google token")
            # Find or create user
            user = db.query(User).filter(User.id == google_id).first()
            now = datetime.utcnow()
            if user:
                user.email = info.get("email", user.email)
                user.name = info.get("name", user.name)
                user.last_login_at = now
            else:
                user = User(
                    id=google_id,
                    email=info.get("email"),
                    name=info.get("name"),
                    created_at=now,
                    last_login_at=now
                )
                db.add(user)
            db.commit()
            db.refresh(user)
            return user
        except HTTPException:
            raise
        except Exception:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")
        
@router.post("/switch-model")
async def switch_model(
    model_index: int = Body(..., embed=True),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Switch the user's selected model."""
    subscription_service = SubscriptionService(db)
    user_plan = subscription_service.get_user_plan(current_user.id)
    plan_name = user_plan.get('name', 'free')
    
    # Get all available models
    all_models = [AI_MODELS['free']] + AI_MODELS.get(plan_name, [])
    
    if model_index < 0 or model_index >= len(all_models):
        raise HTTPException(status_code=400, detail="Invalid model index")
    
    selected_model = all_models[model_index]
    
    # Check if user can use this model
    if model_index > 0 and plan_name == 'free':  # Index 0 is free model
        raise HTTPException(
            status_code=403, 
            detail="Please upgrade your plan to use premium models"
        )
    
    # Update subscription
    subscription = db.query(Subscription).filter(
        Subscription.user_id == current_user.id,
        Subscription.status == 'active'
    ).first()
    
    if not subscription:
        subscription = Subscription(
            user_id=current_user.id,
            plan=plan_name,
            status='active',
            current_period_end=datetime.utcnow() + timedelta(days=365),
            selected_model_index=model_index
        )
        db.add(subscription)
    else:
        subscription.selected_model_index = model_index
    
    db.commit()
    
    return {
        "success": True,
        "model": selected_model['name']
    }

@router.post("/google", response_model=UserResponse)
async def google_auth(request: GoogleAuthRequest, db: Session = Depends(get_db)):
    """
    Authenticate user with Google OAuth.
    Returns user object with subscription info, creates/updates user, updates last_login_at.
    """
    google_user = None
    
    # First try to verify Google ID token
    try:
        google_user = verify_google_token(request.id_token)
    except HTTPException:
        # If ID token verification fails, try using access token to get user info
        try:
            resp = requests.get(
                "https://www.googleapis.com/oauth2/v2/userinfo",
                headers={"Authorization": f"Bearer {request.access_token}"},
                timeout=5
            )
            if resp.status_code == 200:
                info = resp.json()
                google_user = {
                    "id": info.get("id"),
                    "email": info.get("email"),
                    "name": info.get("name"),
                    "picture": info.get("picture")
                }
            else:
                raise HTTPException(status_code=400, detail="Invalid Google access token")
        except Exception as e:
            raise HTTPException(status_code=400, detail="Failed to verify Google credentials")
    
    if not google_user or not google_user.get("id"):
        raise HTTPException(status_code=400, detail="Invalid Google token")

    user = db.query(User).filter(User.id == google_user["id"]).first()
    now = datetime.utcnow()
    if user:
        # Update user info and last_login_at
        user.email = google_user.get("email", user.email)
        user.name = google_user.get("name", user.name)
        user.last_login_at = now
    else:
        # Create new user
        user = User(
            id=google_user["id"],
            email=google_user.get("email"),
            name=google_user.get("name"),
            created_at=now,
            last_login_at=now
        )
        db.add(user)
    
    try:
        db.commit()
        db.refresh(user)
    except SQLAlchemyError as e:
        db.rollback()
        raise HTTPException(status_code=500, detail="Database error")

    # Create JWT access token
    access_token = create_access_token({"id": user.id, "email": user.email})
    
    # Get user's subscription information - CRITICAL for immediate frontend access
    subscription_service = SubscriptionService(db)
    user_subscription = None
    try:
        plan = subscription_service.get_user_plan(user.id)
        usage = subscription_service.get_user_usage(user.id)
        user_subscription = {
            'plan': plan,
            'usage': usage
        }
        print(f"✅ Successfully fetched subscription for user {user.id}: {plan['name']}")
    except Exception as e:
        print(f"⚠️ Warning: Could not fetch subscription for user {user.id}: {e}")
        # Provide default free plan if subscription fetch fails
        user_subscription = {
            'plan': {
                'name': 'free',
                'display_name': 'Free Plan',
                'limits': {'max_schemas_per_month': 5, 'max_competitions_per_month': 3},
                'features': {'can_download_certificates': False, 'can_get_master_certificate': False},
                'selected_model_index': 0
            },
            'usage': {'schemas_generated': 0, 'competitions_entered': 0}
        }
    
    user_dict = {
        "id": user.id,
        "email": user.email,
        "name": user.name,
        "picture": google_user.get("picture"),
        "points": user.points if hasattr(user, 'points') else 0,
        "membership": user.membership if hasattr(user, 'membership') else 'free',
        "created_at": user.created_at.isoformat() if user.created_at else None,
        "last_login_at": user.last_login_at.isoformat() if user.last_login_at else None,
        "subscription": user_subscription  # ✅ ALWAYS include subscription data
    }
    
    return {
        "user": user_dict,
        "access_token": access_token,
        "token_type": "bearer"
    }

@router.post("/logout", response_model=SuccessResponse)
async def logout(current_user: User = Depends(get_current_user)):
    """
    Logout current user. Invalidate JWT/session and delete user's DuckDB file.
    """

    # Path to the user's DuckDB file (adjust path as needed)
    duckdb_dir = os.getenv("USER_DUCKDB_DIR", "user_dbs")
    duckdb_file = os.path.join(duckdb_dir, f"{current_user.id}.duckdb")

    # Attempt to delete the DuckDB file if it exists
    try:
        if os.path.exists(duckdb_file):
            os.remove(duckdb_file)
    except Exception as e:
        # Log error but do not fail logout
        import logging
        logging.error(f"Failed to delete DuckDB file for user {current_user.id}: {e}")

    return {"success": True, "message": "Logged out successfully and user database deleted."}

@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Get current authenticated user information with subscription data.
    """
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Get user's subscription information
    subscription_service = SubscriptionService(db)
    user_subscription = None
    try:
        plan = subscription_service.get_user_plan(current_user.id)
        usage = subscription_service.get_user_usage(current_user.id)
        user_subscription = {
            'plan': plan,
            'usage': usage
        }
    except Exception as e:
        print(f"Warning: Could not fetch subscription for user {current_user.id}: {e}")
        user_subscription = None
    
    user_dict = {
        "id": current_user.id,
        "email": current_user.email,
        "name": current_user.name,
        "picture": getattr(current_user, 'picture', None),
        "points": getattr(current_user, 'points', 0),
        "membership": getattr(current_user, 'membership', 'free'),
        "created_at": current_user.created_at.isoformat() if current_user.created_at else None,
        "last_login_at": current_user.last_login_at.isoformat() if current_user.last_login_at else None,
        "subscription": user_subscription  # Add subscription data
    }
    
    return {
        "user": user_dict,
        "access_token": None,  # Not needed for /me endpoint
        "token_type": "bearer"
    }

@router.get("/available-models")
async def get_available_models(current_user: Any = Depends(get_current_user)):
    """Get list of available AI models based on user's plan."""
    subscription_service = SubscriptionService(db)
    user_plan = subscription_service.get_user_plan(current_user.id)
    plan_name = user_plan.get('name', 'free')
    
    if plan_name == 'free':
        return {
            'current_model': AI_MODELS['free']['name'],
            'available_models': [AI_MODELS['free']]
        }
    
    available_models = AI_MODELS[plan_name]
    return {
        'current_model': available_models[current_user.selected_model_index]['name'],
        'available_models': available_models
    }