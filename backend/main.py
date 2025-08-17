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
dspy.settings.configure(lm=default_lm)

app = FastAPI(
    title="SQL Tutor AI API",
    description="Backend API for SQL Tutor AI application",
    version="1.0.0"
)

# CORS middleware for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        # "http://localhost:3000",  # Local development
        # "https://aisql-trainer.vercel.app/",  # Replace with your actual Vercel URL
        os.environ.get('FRONTEND_URL', "http://localhost:3000")  # Fallback
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