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

# Import routes
from routes import (
    auth_router, sql_practice_router, competition_router,
    dashboard_router
)
lm = dspy.LM(model="openai/gpt-4o-mini", max_tokens=5000)
dspy.settings.configure(lm=lm)

# Load environment variables
load_dotenv()

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
 
    uvicorn.run(app, host="0.0.0.0", port=os.environ("PORT")) 