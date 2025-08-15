"""
Competition routes for SQL Tutor AI backend.
Handles SQL competitions, submissions, and leaderboards.
"""

from fastapi import APIRouter, Depends, HTTPException
from typing import List, Dict, Any

from models.schemas import (
    CompetitionStartRequest, CompetitionStartResponse, CompetitionSubmitRequest,
    CompetitionSubmitResponse, CompetitionHistoryResponse
)
from routes.auth import get_current_user
from utils.subscription_service import SubscriptionService
from routes.auth import get_db
from models.schemas import SQLSchemaRequest, SQLSchemaResponse
from routes.achievements import check_master_certificate_eligibility

router = APIRouter(prefix="/api/competition", tags=["Competition"])

@router.post("/start", response_model=CompetitionStartResponse)
async def start_competition(
    request: CompetitionStartRequest, 
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Start new competition session.
    - difficulty: beginner, intermediate, advanced
    - time_limit: Time limit in seconds
    Returns competition ID, schema, time limit, and expiration.
    """
    # TODO: Generate/select schema, create competition session, associate with user
    pass

@router.post("/submit", response_model=CompetitionSubmitResponse)
async def submit_competition(
    request: CompetitionSubmitRequest, 
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Submit competition query.
    - competition_id: ID of the competition
    - query: SQL query to submit
    Returns success, score, time taken, rank, and feedback.
    """
    # TODO: Validate competition, execute/analyze query, store submission, calculate rank
    pass

@router.get("/history", response_model=List[CompetitionHistoryResponse])
async def get_competition_history(current_user: Dict[str, Any] = Depends(get_current_user)):
    """
    Get user's competition history.
    Returns list of past competitions with scores and ranks.
    """
    # TODO: Query DB for user's competition history
    pass

@router.get("/leaderboard/{competition_id}")
async def get_competition_leaderboard(
    competition_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Get competition leaderboard.
    Returns list of top performers and user rankings.
    """
    # TODO: Query DB for competition leaderboard
    pass

@router.get("/active")
async def get_active_competitions(current_user: Dict[str, Any] = Depends(get_current_user)):
    """
    Get currently active competitions.
    Returns list of active competitions user can join.
    """
    # TODO: Query DB for active competitions
    pass 

@router.post("/enter-competition")
async def enter_competition(
    request: CompetitionStartRequest,
    db=Depends(get_db),
    current_user: Any = Depends(get_current_user)
):
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Check subscription limits
    subscription_service = SubscriptionService(db)
    feature_check = subscription_service.can_use_feature(current_user.id, "competition")
    
    if not feature_check["allowed"]:
        raise HTTPException(
            status_code=403, 
            detail=feature_check["reason"]
        )
    
    try:
        # ... existing competition code ...
        
        # Increment usage after successfully entering
        subscription_service.increment_usage(current_user.id, "competition")
        
        return {"status": "success", "message": "Successfully entered competition"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) 