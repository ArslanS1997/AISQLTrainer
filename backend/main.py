"""
Main FastAPI application for SQL Tutor AI backend.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime
import os
from dotenv import load_dotenv
import dspy
import uvicorn
from utils.subscription_service import SubscriptionService

# Import routes
from routes import (
    auth_router, sql_practice_router, competition_router,
    dashboard_router, stripe_router
)

# Load environment variables
load_dotenv()

# Model configurations
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
            'max_tokens': 8000,
            'api_key_env': 'OPENAI_API_KEY'
        },
        {
            'provider': 'anthropic',
            'name': 'claude-3.5-sonnet',
            'max_tokens': 7000,
            'api_key_env': 'ANTHROPIC_API_KEY'
        },
        {
            'provider': 'gemini',
            'name': 'gemini-2.5-pro',
            'max_tokens': 7000,
            'api_key_env': 'GEMINI_API_KEY'
        }
    ],
    'max': [
        {
            'provider': 'openai',
            'name': 'gpt-5',
            'max_tokens': 8000,
            'api_key_env': 'OPENAI_API_KEY'
        },
        {
            'provider': 'anthropic',
            'name': 'claude-3.5-sonnet',
            'max_tokens': 7000,
            'api_key_env': 'ANTHROPIC_API_KEY'
        },
        {
            'provider': 'gemini',
            'name': 'gemini-2.5-pro',
            'max_tokens': 7000,
            'api_key_env': 'GEMINI_API_KEY'
        }
    ]
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
    
    return dspy.LM(
        model=f"{model_config['provider']}/{model_config['name']}", 
        api_key=api_key,
        max_tokens=model_config['max_tokens']
    )

# Default model for non-authenticated routes
default_lm = dspy.LM(
    model=f"{AI_MODELS['free']['provider']}/{AI_MODELS['free']['name']}", 
    api_key=os.getenv(AI_MODELS['free']['api_key_env']),
    max_tokens=AI_MODELS['free']['max_tokens']
)
dspy.settings.configure(lm=default_lm)

app = FastAPI(
    title="SQL Tutor AI API",
    description="Backend API for SQL Tutor AI application",
    version="1.0.0"
)

# CORS middleware for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Add your frontend URLs
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth_router)
app.include_router(sql_practice_router)
app.include_router(competition_router)
app.include_router(dashboard_router)
app.include_router(stripe_router)


# ============================================================================
# HEALTH CHECK
# ============================================================================

@app.get("/health")
async def health_check():
    """
    Health check endpoint.
    
    Expected output:
    - API status and version
    """
    return {
        "status": "healthy",
        "version": "1.0.0",
        "timestamp": datetime.utcnow()
    }

if __name__ == "__main__":
 
    uvicorn.run(app, host="0.0.0.0", port=int(os.environ.get("PORT", 10000)))