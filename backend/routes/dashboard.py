"""
Dashboard routes for SQL Tutor AI backend.
Handles user statistics, progress tracking, and analytics.
"""

from fastapi import APIRouter, Depends, HTTPException
from typing import Dict, Any, List
from sqlalchemy.orm import Session
from datetime import datetime, timedelta

from models.schemas import DashboardStatsResponse, ProgressResponse
from routes.auth import get_current_user
from db.session import get_db
from db.models import DBSession, Competition, CompetitionSubmission, Achievement

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])

@router.get("/stats", response_model=DashboardStatsResponse)
async def get_dashboard_stats(
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get user statistics for dashboard.
    Returns total sessions, competitions, average score, points, streak, best rank.
    """
    user_id = current_user.id

    # Total practice sessions
    total_sessions = db.query(DBSession).filter(DBSession.user_id == user_id).count()

    # Total competitions participated
    total_competitions = db.query(CompetitionSubmission).filter(CompetitionSubmission.user_id == user_id).count()

    # Average score (practice sessions)
    avg_score = db.query(DBSession).filter(DBSession.user_id == user_id, DBSession.total_score != None).with_entities(DBSession.total_score).all()
    avg_score = round(sum([s[0] for s in avg_score]) / len(avg_score), 2) if avg_score else 0

    # Total points (sum of all session scores)
    total_points = db.query(DBSession).filter(DBSession.user_id == user_id, DBSession.total_score != None).with_entities(DBSession.total_score).all()
    total_points = sum([s[0] for s in total_points]) if total_points else 0

    # Streak (consecutive days with at least one session)
    sessions = db.query(DBSession).filter(DBSession.user_id == user_id).order_by(DBSession.created_at.desc()).all()
    streak = 0
    today = datetime.utcnow().date()
    for s in sessions:
        session_date = s.created_at.date()
        if session_date == today - timedelta(days=streak):
            streak += 1
        elif session_date < today - timedelta(days=streak):
            break

    # Best competition rank
    best_rank = None
    user_submissions = db.query(CompetitionSubmission).filter(CompetitionSubmission.user_id == user_id).all()
    for sub in user_submissions:
        if sub.rank is not None:
            if best_rank is None or sub.rank < best_rank:
                best_rank = sub.rank

    return DashboardStatsResponse(
        total_sessions=total_sessions,
        total_competitions=total_competitions,
        average_score=avg_score,
        total_points=total_points,
        streak=streak,
        best_rank=best_rank
    )

@router.get("/progress", response_model=ProgressResponse)
async def get_learning_progress(
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get user's learning progress.
    Returns progress by difficulty, total queries, accuracy, learning path.
    """
    user_id = current_user.id

    # Progress by difficulty
    sessions = db.query(DBSession).filter(DBSession.user_id == user_id).all()
    progress_by_difficulty = {"basic": 0, "intermediate": 0, "advanced": 0}
    total_queries = 0
    correct_queries = 0

    for s in sessions:
        if hasattr(s, "difficulty") and s.difficulty in progress_by_difficulty:
            progress_by_difficulty[s.difficulty] += 1
        if s.queries:
            total_queries += len(s.queries)
            # If queries have correctness info, count correct ones
            for q in s.queries:
                if isinstance(q, dict) and q.get("is_correct"):
                    correct_queries += 1

    # Accuracy
    accuracy = round((correct_queries / total_queries) * 100, 2) if total_queries > 0 else 0.0

    # Learning path (list of completed difficulties)
    learning_path = [k for k, v in progress_by_difficulty.items() if v > 0]

    return ProgressResponse(
        progress_by_difficulty=progress_by_difficulty,
        total_queries=total_queries,
        accuracy=accuracy,
        learning_path=learning_path
    )

@router.get("/recent-activity")
async def get_recent_activity(
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get user's recent activity.
    Returns recent sessions, competitions, achievements.
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

    # Recent competitions (last 5)
    recent_competitions = (
        db.query(CompetitionSubmission)
        .filter(CompetitionSubmission.user_id == user_id)
        .order_by(CompetitionSubmission.submitted_at.desc())
        .limit(5)
        .all()
    )
    competitions_data = [
        {
            "competition_id": c.competition_id,
            "score": c.score,
            "rank": c.rank,
            "submitted_at": c.submitted_at
        }
        for c in recent_competitions
    ]

    # Recent achievements (last 5)
    recent_achievements = (
        db.query(Achievement)
        .filter(Achievement.user_id == user_id)
        .order_by(Achievement.earned_at.desc())
        .limit(5)
        .all()
    )
    achievements_data = [
        {
            "achievement_id": a.id,
            "name": a.name,
            "earned_at": a.earned_at
        }
        for a in recent_achievements
    ]

    return {
        "recent_sessions": sessions_data,
        "recent_competitions": competitions_data,
        "recent_achievements": achievements_data
    }

@router.get("/achievements")
async def get_user_achievements(
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get user's achievements and badges.
    Returns earned achievements and progress towards next.
    """
    user_id = current_user.id

    # Earned achievements
    earned_achievements = db.query(Achievement).filter(Achievement.user_id == user_id).all()
    achievements_data = [
        {
            "achievement_id": a.id,
            "name": a.name,
            "description": a.description,
            "earned_at": a.earned_at
        }
        for a in earned_achievements
    ]

    # Progress towards next (dummy example: next achievement is 10 sessions)
    total_sessions = db.query(DBSession).filter(DBSession.user_id == user_id).count()
    next_achievement = None
    if total_sessions < 10:
        next_achievement = {
            "name": "Session Novice",
            "description": "Complete 10 practice sessions",
            "progress": f"{total_sessions}/10"
        }

    return {
        "earned_achievements": achievements_data,
        "next_achievement": next_achievement
    }