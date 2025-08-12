"""
Dashboard routes for SQL Tutor AI backend.
Handles user statistics, progress tracking, and analytics.
"""

from fastapi import APIRouter, Depends
from typing import Dict, Any, List
from sqlalchemy.orm import Session
from datetime import datetime, timedelta

from models.schemas import DashboardStatsResponse, ProgressResponse, CompetitionHistoryResponse
from routes.auth import get_current_user, get_db
from models.database import Session as DBSession
from models.database import CompetitionSubmission

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])

@router.get("/stats", response_model=DashboardStatsResponse)
async def get_dashboard_stats(
    current_user: Any = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get user statistics for dashboard.
    Returns total practice sessions, competitions, average score, points, streak, best rank.
    """
    user_id = current_user.id

    # Total practice sessions
    total_practice_sessions = db.query(DBSession).filter(DBSession.user_id == user_id).count()

    # Total competitions participated
    total_competitions = db.query(CompetitionSubmission).filter(CompetitionSubmission.user_id == user_id).count()

    # Average score (practice sessions)
    scores = db.query(DBSession.total_score).filter(
        DBSession.user_id == user_id, DBSession.total_score != None
    ).all()
    scores_list = [s[0] for s in scores]
    average_score = round(sum(scores_list) / len(scores_list), 2) if scores_list else 0.0

    # Total points (sum of all session scores)
    total_points = sum(scores_list) if scores_list else 0

    # Current streak (consecutive days with at least one session)
    sessions = db.query(DBSession).filter(DBSession.user_id == user_id).order_by(DBSession.created_at.desc()).all()
    current_streak = 0
    today = datetime.utcnow().date()
    for s in sessions:
        session_date = s.created_at.date()
        if session_date == today - timedelta(days=current_streak):
            current_streak += 1
        elif session_date < today - timedelta(days=current_streak):
            break

    # Best competition rank
    best_rank = None
    user_submissions = db.query(CompetitionSubmission).filter(CompetitionSubmission.user_id == user_id).all()
    for sub in user_submissions:
        if sub.rank is not None:
            if best_rank is None or sub.rank < best_rank:
                best_rank = sub.rank

    return DashboardStatsResponse(
        total_practice_sessions=total_practice_sessions,
        total_competitions=total_competitions,
        average_score=average_score,
        total_points=total_points,
        current_streak=current_streak,
        best_rank=best_rank
    )

@router.get("/progress", response_model=ProgressResponse)
async def get_learning_progress(
    current_user: Any = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get user's learning progress.
    Returns progress by difficulty, total queries, accuracy rate, learning path.
    """
    user_id = current_user.id

    # Progress by difficulty
    sessions = db.query(DBSession).filter(DBSession.user_id == user_id).all()
    beginner_completed = 0
    intermediate_completed = 0
    advanced_completed = 0
    total_queries = 0
    correct_queries = 0

    for s in sessions:
        difficulty = getattr(s, "difficulty", None)
        if difficulty == "beginner":
            beginner_completed += 1
        elif difficulty == "intermediate":
            intermediate_completed += 1
        elif difficulty == "advanced":
            advanced_completed += 1
        if s.queries:
            total_queries += len(s.queries)
            for q in s.queries:
                if isinstance(q, dict) and q.get("is_correct"):
                    correct_queries += 1

    accuracy_rate = round((correct_queries / total_queries) * 100, 2) if total_queries > 0 else 0.0

    # Learning path (list of dicts, e.g. [{"difficulty": "beginner", "completed": 3}, ...])
    learning_path = []
    if beginner_completed > 0:
        learning_path.append({"difficulty": "beginner", "completed": beginner_completed})
    if intermediate_completed > 0:
        learning_path.append({"difficulty": "intermediate", "completed": intermediate_completed})
    if advanced_completed > 0:
        learning_path.append({"difficulty": "advanced", "completed": advanced_completed})

    return ProgressResponse(
        beginner_completed=beginner_completed,
        intermediate_completed=intermediate_completed,
        advanced_completed=advanced_completed,
        total_queries=total_queries,
        accuracy_rate=accuracy_rate,
        learning_path=learning_path
    )

@router.get("/recent-activity")
async def get_recent_activity(
    current_user: Any = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get user's recent activity.
    Returns recent sessions and competitions.
    """
    user_id = current_user.id

    # Recent sessions (last 5)
    recent_sessions = db.query(DBSession).filter(DBSession.user_id == user_id).order_by(DBSession.created_at.desc()).limit(5).all()
    sessions_data = [
        {
            "session_id": s.id,
            "created_at": s.created_at,
            "total_score": s.total_score,
            "difficulty": getattr(s, "difficulty", None)
        }
        for s in recent_sessions
    ]

    # Recent competitions (last 5) using CompetitionHistoryResponse
    recent_competitions = (
        db.query(CompetitionSubmission)
        .filter(CompetitionSubmission.user_id == user_id)
        .order_by(CompetitionSubmission.submitted_at.desc())
        .limit(5)
        .all()
    )
    competitions_data: List[CompetitionHistoryResponse] = [
        CompetitionHistoryResponse(
            competition_id=c.competition_id,
            schema_id=getattr(c, "schema_id", None),
            difficulty=getattr(c, "difficulty", None),
            time_limit=getattr(c, "time_limit", None),
            started_at=getattr(c, "started_at", None),
            expires_at=getattr(c, "expires_at", None),
            score=c.score,
            rank=c.rank,
            time_taken=getattr(c, "time_taken", None),
            completed_at=getattr(c, "submitted_at", None),
        )
        for c in recent_competitions
    ]

    return {
        "recent_sessions": sessions_data,
        "recent_competitions": [c.model_dump() if hasattr(c, "model_dump") else c.dict() for c in competitions_data],
    }

@router.get("/achievements")
async def get_user_achievements(
    current_user: Any = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    (Deprecated) Achievements endpoint is not used. Use competition history instead.
    """
    return {
        "message": "Achievements endpoint is deprecated. Please use /recent-activity for competition history."
    }