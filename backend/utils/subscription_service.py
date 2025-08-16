from sqlalchemy.orm import Session
from sqlalchemy import extract
from datetime import datetime, timedelta
from models.database import User, Subscription, UserUsage, SubscriptionPlan
from typing import Optional, Dict, Any
import os

PLAN_CONFIGS = {
    'free': {
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
        }
    },
    'pro': {
        'name': 'pro',
        'display_name': 'Pro Plan',
        'limits': {
            'max_schemas_per_month': 15,
            'max_competitions_per_month': 15
        },
        'features': {
            'can_download_certificates': True,
            'can_get_master_certificate': True,
            'ai_model_tier': 'gpt-5'
        }
    },
    'max': {
        'name': 'max',
        'display_name': 'Max Plan',
        'limits': {
            'max_schemas_per_month': 50,
            'max_competitions_per_month': 50
        },
        'features': {
            'can_download_certificates': True,
            'can_get_master_certificate': True,
            'ai_model_tier': 'gpt-5'
        }
    }
}



class SubscriptionService:
    def __init__(self, db: Session):
        self.db = db

    def get_user_plan(self, user_id: str) -> Dict[str, Any]:
        """Get user's current subscription plan with features."""
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            return self._get_free_plan()
        
        # Check for active subscription
        subscription = self.db.query(Subscription).filter(
            Subscription.user_id == user_id,
            Subscription.status == 'active',
            Subscription.current_period_end > datetime.utcnow()
        ).first()
        
        # If no subscription exists, create one with the default plan
        if not subscription:
            default_plan = os.getenv('DEFAULT_PLAN', 'free').lower()
            subscription = Subscription(
                user_id=user_id,
                plan=default_plan,
                status='active',
                current_period_end=datetime.utcnow() + timedelta(days=365),  # Set a far future date
                cancel_at_period_end=False,
                selected_model_index=0
            )
            self.db.add(subscription)
            self.db.commit()
            self.db.refresh(subscription)
        
        plan_config = PLAN_CONFIGS.get(subscription.plan, PLAN_CONFIGS['free'])
        return {
            'name': subscription.plan,
            'display_name': plan_config['display_name'],
            'limits': {
                'max_schemas_per_month': plan_config['limits']['max_schemas_per_month'],
                'max_competitions_per_month': plan_config['limits']['max_competitions_per_month']
            },
            'features': {
                'can_download_certificates': plan_config['features']['can_download_certificates'],
                'can_get_master_certificate': plan_config['features']['can_get_master_certificate'],
                'ai_model_tier': plan_config['features']['ai_model_tier']
            },
            'selected_model_index': getattr(subscription, 'selected_model_index', 0)
        }
    
    def get_user_usage(self, user_id: str) -> Dict[str, int]:
        """Get user's current month usage."""
        now = datetime.utcnow()
        usage = self.db.query(UserUsage).filter(
            UserUsage.user_id == user_id,
            UserUsage.year == now.year,
            UserUsage.month == now.month
        ).first()
        
        if not usage:
            # Create usage record for current month
            usage = UserUsage(
                user_id=user_id,
                year=now.year,
                month=now.month,
                schemas_generated=0,
                competitions_entered=0
            )
            self.db.add(usage)
            self.db.commit()
        
        return {
            'schemas_generated': usage.schemas_generated,
            'competitions_entered': usage.competitions_entered
        }
    
    def can_use_feature(self, user_id: str, feature: str) -> Dict[str, Any]:
        """Check if user can use a specific feature."""
        plan = self.get_user_plan(user_id)
        usage = self.get_user_usage(user_id)
        
        result = {'allowed': False, 'reason': '', 'limit': 0, 'used': 0}
        
        if feature == 'generate_schema':
            limit = plan['limits']['max_schemas_per_month']  # Use the limits from plan config
            result['limit'] = limit
            result['used'] = usage['schemas_generated']
            result['allowed'] = usage['schemas_generated'] < limit
            if not result['allowed']:
                result['reason'] = f"Monthly schema limit reached ({limit})"
                
        elif feature == 'competition':
            limit = plan['limits']['max_competitions_per_month']  # Fix this line
            result['limit'] = limit
            result['used'] = usage['competitions_entered']
            result['allowed'] = usage['competitions_entered'] < limit
            if not result['allowed']:
                result['reason'] = f"Monthly competition limit reached ({limit})"
                
        elif feature == 'download_certificate':
            result['allowed'] = plan['features']['can_download_certificates']  # Fix this line
            if not result['allowed']:
                result['reason'] = "Certificate download requires Pro or Max plan"
                
        elif feature == 'master_certificate':
            result['allowed'] = plan['features']['can_get_master_certificate']  # Fix this line
            if not result['allowed']:
                result['reason'] = "Master certificate requires Pro or Max plan"
        
        return result
    
    def increment_usage(self, user_id: str, feature: str):
        """Increment user's feature usage for current month."""
        now = datetime.utcnow()
        usage = self.db.query(UserUsage).filter(
            UserUsage.user_id == user_id,
            UserUsage.year == now.year,
            UserUsage.month == now.month
        ).first()
        
        if not usage:
            usage = UserUsage(
                user_id=user_id,
                year=now.year,
                month=now.month
            )
            self.db.add(usage)
        
        if feature == 'generate_schema':
            usage.schemas_generated += 1
        elif feature == 'competition':
            usage.competitions_entered += 1
            
        self.db.commit()
    
    def _get_free_plan(self) -> Dict[str, Any]:
        """Return default plan (configurable via env)."""
        default_plan = os.getenv('DEFAULT_PLAN', 'free').lower()
        plan_config = PLAN_CONFIGS[default_plan]
        return {
            'name': default_plan,
            'display_name': plan_config['display_name'],
            'limits': {
                'max_schemas_per_month': plan_config['limits']['max_schemas_per_month'],
                'max_competitions_per_month': plan_config['limits']['max_competitions_per_month']
            },
            'features': {
                'can_download_certificates': plan_config['features']['can_download_certificates'],
                'can_get_master_certificate': plan_config['features']['can_get_master_certificate'],
                'ai_model_tier': plan_config['features']['ai_model_tier']
            }
        }
    
    def _plan_to_dict(self, plan: SubscriptionPlan) -> Dict[str, Any]:
        """Convert plan model to dictionary."""
        return {
            'name': plan.name,
            'display_name': plan.display_name,
            'max_schemas_per_month': plan.max_schemas_per_month,
            'max_competitions_per_month': plan.max_competitions_per_month,
            'can_download_certificates': plan.can_download_certificates,
            'can_get_master_certificate': plan.can_get_master_certificate,
            'ai_model_tier': plan.ai_model_tier
        }
