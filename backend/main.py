"""
Main FastAPI application for SQL Trainer AI backend.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime
import os
from dotenv import load_dotenv
import dspy
import uvicorn
from utils.subscription_service import SubscriptionService
from models import SessionLocal
from config.redis_config import init_cache  # Add this import

# Import routes
from routes import (
    auth_router, sql_practice_router, competition_router,
    dashboard_router, stripe_router
)

from routes.auth import AI_MODELS
# Load environment variables
load_dotenv()

# Model configurations

# Default model for non-authenticated routes
default_lm = dspy.LM(
    model=f"{AI_MODELS['free']['provider']}/{AI_MODELS['free']['name']}", 
    api_key=os.getenv(AI_MODELS['free']['api_key_env']),
    max_tokens=AI_MODELS['free']['max_tokens']
)
dspy.settings.configure(lm=default_lm, async_max_workers=25)

app = FastAPI(
    title="SQL Trainer AI API",
    description="Backend API for SQL Trainer AI application",
    version="1.0.0"
)

# CORS middleware for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        os.environ.get('FRONTEND_URL')  # Fallback
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
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
    """Health check endpoint for monitoring."""
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}

# Add this to your app startup
@app.on_event("startup")
async def startup_event():
    # Initialize Redis cache first
    await init_cache()
    
    # Populate plans if table is empty
    db = SessionLocal()
    try:
        subscription_service = SubscriptionService(db)
        subscription_service.populate_plans_if_empty()
    finally:
        db.close()

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=int(os.environ.get("PORT", 10000)))