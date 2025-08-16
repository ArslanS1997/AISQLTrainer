"""
Competition routes for SQL Tutor AI backend.
Handles User vs AI SQL competitions with binary win/lose outcomes.
"""

from fastapi import APIRouter, Depends, HTTPException
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import uuid
import time
import duckdb

from models.database import CompetitionSubmission
from models.schemas import (
    CompetitionStartRequest, CompetitionStartResponse,
    CompetitionSubmitRequest, CompetitionSubmitResponse,
    CompetitionHistoryResponse, AICompetitionRequest, AICompetitionResponse
)
from routes.auth import get_current_user, get_db
from utils.subscription_service import SubscriptionService
from utils.agents import ai_competitor_agent
import threading 
router = APIRouter(prefix="/api/competition", tags=["Competition"])

# Point system based on difficulty
DIFFICULTY_POINTS = {
    'basic': 10,
    'intermediate': 20, 
    'advanced': 30
}
_duckdb_conn_cache = {}
_duckdb_conn_lock = threading.Lock()

def get_competition_duckdb_conn(competition_id:str):
    """
    Returns a persistent DuckDB connection for the given user_id and session_id.
    Ensures the same connection object is returned for repeated calls.
    """
    key = (competition_id)
    db_filename = f'db_{competition_id}.duckdb'
    with _duckdb_conn_lock:
        conn = _duckdb_conn_cache.get(key)
        if conn is not None:
            try:
                # Check if connection is still alive
                conn.execute("SELECT 1")
                return conn
            except Exception:
                # Connection is dead, remove from cache
                try:
                    conn.close()
                except Exception:
                    pass
                _duckdb_conn_cache.pop(key, None)
        # Create new connection and cache it
        conn = duckdb.connect(database=db_filename)
        _duckdb_conn_cache[key] = conn
        return conn


@router.post("/start", response_model=CompetitionStartResponse)
async def start_competition(
    request: CompetitionStartRequest,
    current_user: Any = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Start a new User vs AI competition."""
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Check subscription limits
    subscription_service = SubscriptionService(db)
    feature_check = subscription_service.can_use_feature(current_user.id, "competition")
    
    if not feature_check["allowed"]:
        raise HTTPException(status_code=403, detail=feature_check["reason"])
    
    # Generate competition ID and calculate timing
    competition_id = str(uuid.uuid4())
    started_at = datetime.utcnow()
    expires_at = started_at + timedelta(seconds=request.time_limit)
    
    # Create initial competition record
    competition = CompetitionSubmission(
        competition_id=competition_id,
        user_id=current_user.id,
        difficulty=request.difficulty,
        total_rounds=1,  # Single round competition
        rounds_data=[]
    )
    
    db.add(competition)
    db.commit()
    
    # Increment usage
    subscription_service.increment_usage(current_user.id, "competition")
    
    return CompetitionStartResponse(
        competition_id=competition_id,
        difficulty=request.difficulty,
        time_limit=request.time_limit,
        started_at=started_at,
        expires_at=expires_at
    )

@router.post("/ai-response", response_model=AICompetitionResponse)
async def get_ai_response(
    request: AICompetitionRequest,
    current_user: Any = Depends(get_current_user),
    db: Session = Depends(get_db),
    conn = Depends(lambda request: get_competition_duckdb_conn(request.competition_id))
):
    """Get AI's competitive response to the same question."""
    
    # Verify competition exists
    competition = db.query(CompetitionSubmission).filter(
        CompetitionSubmission.competition_id == request.competition_id,
        CompetitionSubmission.user_id == current_user.id
    ).first()
    
    if not competition:
        raise HTTPException(status_code=404, detail="Competition not found")
    # difficulty, question, schema, conn
    # Simulate AI generating SQL query within time limit
    start_time = time.time()
    
    # Generate AI's competitive response based on the question and schema
    response = await ai_competitor_agent(question=request.question, schema=request.schema_ddl, difficulty=request.difficulty, conn= conn)

    
    end_time = time.time()
    time_taken_ms = int((end_time - start_time) * 1000)  # milliseconds
    in_time = time_taken_ms <= (request.time_limit * 1000)
    
    # Store AI's response in competition record for later comparison
    competition.ai_queries = [response.sql]
    competition.ai_score = DIFFICULTY_POINTS[request.difficulty] if in_time else 0
    db.commit()
    
    return AICompetitionResponse(
        competition_id=request.competition_id,
        answer=response.sql,
        difficulty=request.difficulty,
        in_time=in_time
    )

@router.post("/submit", response_model=CompetitionSubmitResponse)
async def submit_competition(
    request: CompetitionSubmitRequest,
    current_user: Any = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Submit user's query for the competition and get final result."""
    
    competition = db.query(CompetitionSubmission).filter(
        CompetitionSubmission.competition_id == request.competition_id,
        CompetitionSubmission.user_id == current_user.id
    ).first()
    
    if not competition:
        raise HTTPException(status_code=404, detail="Competition not found")
    
    # Compare user query vs AI query to determine winner
    points_earned = DIFFICULTY_POINTS[competition.difficulty]
    time_taken = 30  # Placeholder - would be calculated from competition start time
    
    # Simple comparison logic:
    # User wins if they submit a valid query and AI didn't complete in time, or user query is "better"
    user_query_valid = len(request.query.strip()) > 10  # Basic validation
    ai_completed = competition.ai_score > 0  # AI got points = completed in time
    
    # Determine winner based on both submissions
    if user_query_valid and not ai_completed:
        success = True  # User wins if AI failed
    elif not user_query_valid and ai_completed:
        success = False  # AI wins if user failed
    else:
        # Both completed or both failed - simple heuristic
        success = len(request.query) > 50  # Longer query = more complex = user wins
    
    rank = 1 if success else 2  # Binary ranking: 1 = win, 2 = lose
    
    # Update competition record
    competition.user_score = points_earned if success else 0
    competition.result = "win" if success else "lose"
    competition.total_time_taken = time_taken
    competition.submitted_at = datetime.utcnow()
    
    # Store the user's query
    competition.user_queries = [request.query]
    competition.user_correct_answers = 1 if success else 0
    
    db.commit()
    
    return CompetitionSubmitResponse(
        success=success,
        score=competition.user_score,
        time_taken=time_taken,
        rank=rank,
        feedback=f"{'You won against the AI!' if success else 'The AI won this round!'} Your query vs AI query: {competition.ai_queries[0] if competition.ai_queries else 'AI timeout'}"
    )

@router.get("/history")
async def get_competition_history(
    current_user: Any = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user's competition history."""
    
    competitions = db.query(CompetitionSubmission).filter(
        CompetitionSubmission.user_id == current_user.id,
        CompetitionSubmission.result.isnot(None)  # Only completed competitions
    ).order_by(CompetitionSubmission.submitted_at.desc()).all()
    
    history = []
    for c in competitions:
        history.append(CompetitionHistoryResponse(
            competition_id=c.competition_id,
            difficulty=c.difficulty,
            score=c.user_score,
            rank=1 if c.result == "win" else 2,
            time_taken=c.total_time_taken,
            completed_at=c.submitted_at
        ))
    
    return {"competitions": history}

@router.get("/stats")
async def get_competition_stats(
    current_user: Any = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user's competition statistics."""
    
    competitions = db.query(CompetitionSubmission).filter(
        CompetitionSubmission.user_id == current_user.id,
        CompetitionSubmission.result.isnot(None)
    ).all()
    
    total_competitions = len(competitions)
    wins = len([c for c in competitions if c.result == "win"])
    total_score = sum(c.user_score for c in competitions)
    
    return {
        "total_competitions": total_competitions,
        "wins": wins,
        "losses": total_competitions - wins,
        "win_rate": wins / total_competitions if total_competitions > 0 else 0,
        "total_score": total_score,
        "average_score": total_score / total_competitions if total_competitions > 0 else 0
    }