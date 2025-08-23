"""
Dashboard routes for SQL Trainer AI backend.
Handles user statistics, progress tracking, and analytics.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from datetime import datetime, timedelta

from models.schemas import DashboardStatsResponse, ProgressResponse, CompetitionHistoryResponse
from routes.auth import get_current_user, get_db
from models.database import Session as DBSession
from models.database import Competition
from models.database import SessionQuestion

from utils.subscription_service import SubscriptionService
from utils.cache_decorators import cache_with_key, invalidate_user_cache, cache_with_smart_invalidation
from utils.cache_decorators import generate_cache_key
import json
from functools import wraps

router = APIRouter(prefix="/api/achievements", tags=["Achievements"])
# Fix the average score calculation and remove rank (competition has no ranks, just points/wins)
@router.get("/stats", response_model=DashboardStatsResponse)
@cache_with_key(expire=300)  # Cache for 5 minutes
async def get_dashboard_stats(
    current_user: Any = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user's dashboard stats with Redis caching."""
    user_id = current_user.id

    # Calculate average score from SessionQuestion table
    total_correct = 0
    total_queries = 0
    sessions = db.query(DBSession).filter(DBSession.user_id == user_id).all()

    # Return all 0 stats for new user (no sessions)
    if not sessions or len(sessions) == 0:
        return DashboardStatsResponse(
            total_practice_sessions=0,
            total_competitions=0,
            average_score=0.0,
            total_points=0,
            current_streak=0
        )

    # Get all questions for all user sessions
    for session in sessions:
        session_questions = db.query(SessionQuestion).filter(
            SessionQuestion.session_id == session.id
        ).all()
        
        for question in session_questions:
            if question.user_sql is not None:  # Only count answered questions
                total_queries += 1
                if question.is_correct:
                    total_correct += 1

    average_score = round((total_correct / total_queries * 100), 2) if total_queries > 0 else 0.0

    # Total practice sessions
    total_practice_sessions = db.query(DBSession).filter(DBSession.user_id == user_id).count()

    # Total competitions participated
    total_competitions = db.query(Competition).filter(Competition.user_id == user_id).count()

    # Total points (sum of all session scores)
    total_points = sum(s.total_score for s in sessions) if sessions else 0

    # Current streak (consecutive days with at least one session)
    current_streak = 0
    today = datetime.utcnow().date()
    for s in sessions:
        session_date = s.created_at.date()
        if session_date == today - timedelta(days=current_streak):
            current_streak += 1
        elif session_date < today - timedelta(days=current_streak):
            break

    return DashboardStatsResponse(
        total_practice_sessions=total_practice_sessions,
        total_competitions=total_competitions,
        average_score=average_score,
        total_points=total_points,
        current_streak=current_streak
    )



@router.get("/progress", response_model=ProgressResponse)
@cache_with_key(expire=300)  # Cache for 5 minutes
async def get_learning_progress(
    current_user: Any = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get learning progress with Redis caching."""
    """
    Get user's learning progress.
    Returns progress by difficulty, total queries, accuracy rate, learning path.
    """
    user_id = current_user.id

    # Progress by difficulty
    sessions = db.query(DBSession).filter(DBSession.user_id == user_id).all()

    # Return all 0 stats for new user (no sessions)
    if not sessions or len(sessions) == 0:
        return ProgressResponse(
            beginner_completed=0,
            intermediate_completed=0,
            advanced_completed=0,
            total_queries=0,
            accuracy_rate=0.0,
            learning_path=[]
        )

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
        
        # Get questions for this session from SessionQuestion table
        session_questions = db.query(SessionQuestion).filter(
            SessionQuestion.session_id == s.id
        ).all()
        
        # Count total and correct queries
        for question in session_questions:
            if question.user_sql is not None:  # Only count answered questions
                total_queries += 1
                if question.is_correct:
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
    """Get recent activity for the current user."""
    user_id = current_user.id

    # Get recent sessions
    recent_sessions = db.query(DBSession).filter(
        DBSession.user_id == user_id
    ).order_by(DBSession.created_at.desc()).limit(5).all()

    sessions_data = [
        {
            "session_id": s.id,
            "created_at": s.created_at.isoformat() if s.created_at else None,
            "total_score": s.total_score or 0
        }
        for s in recent_sessions
    ]

    # Get recent competitions
    recent_competitions = db.query(Competition).filter(
        Competition.user_id == user_id
    ).order_by(Competition.started_at.desc()).limit(5).all()

    competitions_data = []
    for c in recent_competitions:
        try:
            # Safely get values with defaults for missing fields
            competition_data = CompetitionHistoryResponse(
                competition_id=c.id,
                difficulty=c.difficulty or 'basic',
                user_score=getattr(c, "user_score", 0) or 0,  # Default to 0
                ai_score=getattr(c, "ai_score", 0) or 0,      # Default to 0
                result=getattr(c, "result", "in_progress") or "in_progress",  # Default to "in_progress"
                completed_at=c.completed_at or c.started_at,  # Use started_at if completed_at is None
                total_time_taken=getattr(c, "total_time_taken", 0) or 0,  # Default to 0
                questions=[]  # Default to empty list for now
            )
            competitions_data.append(competition_data)
        except Exception as e:
            # Skip competitions that can't be properly formatted
            print(f"Warning: Could not format competition {c.id}: {e}")
            continue

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
# For testing: force eligibility to True (comment out for production)
# TESTING_FORCE_ELIGIBLE = True

@router.get("/master-certificate-eligibility")
async def check_master_certificate_eligibility(
    current_user: Any = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user_id = current_user.id

    # --- DUMMY TESTING RESPONSE: always eligible, always success, dummy stats ---
    # Comment out this block for production!
    # return {
    #     "is_eligible": True,
    #     "stats": {
    #         "overall_accuracy": 100.0,
    #         "total_queries": 42,
    #         "correct_queries": 42,
    #         "sessions_completed": {
    #             "basic": 10,
    #             "intermediate": 5,
    #             "advanced": 2
    #         }
    #     },
    #     "requirements": {
    #         "minimum_accuracy": 70,
    #         "basic_sessions": 10,
    #         "intermediate_sessions": 5,i
    #         "advanced_sessions": 2
    #         }
    # }
    # --- END DUMMY TESTING RESPONSE ---

    # # PRODUCTION LOGIC BELOW (uncomment for real logic)
    # # Get all user's sessions
    sessions = db.query(DBSession).filter(DBSession.user_id == user_id).all()
    
    # Return all 0 stats for new user (no sessions)
    if not sessions or len(sessions) == 0:
        return {
            "is_eligible": False,
            "stats": {
                "overall_accuracy": 0.0,
                "total_queries": 0,
                "correct_queries": 0,
                "sessions_completed": {
                    "basic": 0,
                    "intermediate": 0,
                    "advanced": 0
                }
            },
            "requirements": {
                "minimum_accuracy": 70,
                "basic_sessions": 10,
                "intermediate_sessions": 5,
                "advanced_sessions": 2
            }
        }
    
    # Calculate overall stats
    total_queries = 0
    correct_queries = 0
    difficulty_completion = {
        "basic": 0,
        "intermediate": 0,
        "advanced": 0
    }
    
    for session in sessions:
        # Get questions for this session from SessionQuestion table
        session_questions = db.query(SessionQuestion).filter(
            SessionQuestion.session_id == session.id
        ).all()
        
        # Count total and correct queries
        for question in session_questions:
            if question.user_sql is not None:  # Only count answered questions
                total_queries += 1
                if question.is_correct:
                    correct_queries += 1
    
        if session.difficulty:
            difficulty_completion[session.difficulty] += 1
    
    overall_accuracy = (correct_queries / total_queries * 100) if total_queries > 0 else 0
    
    # Check eligibility criteria
    is_eligible = (
        overall_accuracy >= 70 and  # At least 70% overall accuracy
        difficulty_completion["basic"] >= 10 and  # Completed at least 10 basic sessions
        difficulty_completion["intermediate"] >= 5 and  # Completed at least 5 intermediate sessions
        difficulty_completion["advanced"] >= 2  # Completed at least 2 advanced sessions
    )
    
    return {
        "is_eligible": is_eligible,
        "stats": {
            "overall_accuracy": round(overall_accuracy, 2),
            "total_queries": total_queries,
            "correct_queries": correct_queries,
            "sessions_completed": {
                "basic": difficulty_completion["basic"],
                "intermediate": difficulty_completion["intermediate"],
                "advanced": difficulty_completion["advanced"]
            }
        },
        "requirements": {
            "minimum_accuracy": 70,
            "basic_sessions": 10,
            "intermediate_sessions": 5,
            "advanced_sessions": 2
        }
    }



@router.get("/master-certificate")
async def get_master_certificate(
    db=Depends(get_db),
    current_user: Any = Depends(get_current_user)
):
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    # Check subscription allows master certificate
    subscription_service = SubscriptionService(db)
    feature_check = subscription_service.can_use_feature(current_user.id, "can_get_master_certificate")

    if not feature_check["allowed"]:
        raise HTTPException(
            status_code=403, 
            detail=feature_check["reason"]
        )

    # Check eligibility criteria
    eligibility = await check_master_certificate_eligibility(current_user, db)
    if not eligibility["is_eligible"]:
        raise HTTPException(
            status_code=403,
            detail="You haven't met the requirements for the master certificate yet"
        )

    # Generate master certificate data
    certificate_data = {
        "certificate_id": f"MASTER_CERT_{current_user.id}",
        "user_name": current_user.name or current_user.email,
        "type": "master",
        "date": datetime.utcnow().strftime("%B %d, %Y"),
        "stats": eligibility["stats"],
        "certificate_url": f"/api/achievements/master-certificate"
    }
    
    return certificate_data

def get_fresh_certificates(user_id: str, db: Session) -> Dict[str, Any]:
    """Helper function to get fresh certificate data."""
    # Get all user's sessions with their questions
    sessions = db.query(DBSession).filter(
        DBSession.user_id == user_id
    ).all()
    
    certificates = []
    
    for session in sessions:
        print(f"DEBUG: Processing session {session.id} - Difficulty: {session.difficulty}")
        
        # Get questions for this session from SessionQuestion table
        session_questions = db.query(SessionQuestion).filter(
            SessionQuestion.session_id == session.id
        ).all()
        
        # Calculate score percentage - only count answered questions
        total_questions = len(session_questions)
        answered_questions = [q for q in session_questions if q.user_sql is not None]
        correct_questions = sum(1 for q in answered_questions if q.is_correct)

        # Use answered questions for score calculation
        score_percentage = (correct_questions / len(answered_questions) * 100) if len(answered_questions) > 0 else 0

        print(f"🔍 DEBUG: Session {session.id} - Total questions: {total_questions}, Answered: {len(answered_questions)}, Correct: {correct_questions}, Score: {score_percentage}%")

        # Only give certificate for sessions where user actually answered questions
        if len(answered_questions) > 0:
            cert = {
                "id": session.id,
                "session_id": session.id,
                "title": f"{session.difficulty.title() if session.difficulty else 'Basic'} SQL Practice Session",
                "difficulty": session.difficulty or "basic",
                "score": round(score_percentage, 1),  # This is what frontend displays as percentage
                "total_points": len(answered_questions),  # Use answered questions count
                "correct_answers": correct_questions,
                "completion_date": session.created_at.isoformat(),
                "topic": session.difficulty.title() if session.difficulty else "General",
                "certificate_url": f"/api/achievements/certificate/{session.id}",
                "type": "session"
            }
            certificates.append(cert)
            print(f"🔍 DEBUG: Added certificate for session {session.id} with score {score_percentage}%")
        else:
            print(f"🔍 DEBUG: Session {session.id} has no answered questions")
    
    print(f"DEBUG: Returning {len(certificates)} certificates")
    
    return {
        "certificates": certificates,
        "requires_upgrade": False, # No upgrade requirement for certificates
        "user_plan": "premium" # Assuming premium for now
    }

@router.get("/certificates")
@cache_with_smart_invalidation(expire=180)  # 3 minutes default
async def get_user_certificates(
    current_user: Any = Depends(get_current_user),
    db: Session = Depends(get_db),
    force_refresh: bool = Query(False)  # Allow force refresh
):
    """Get user certificates with smart caching."""
    # Check if force refresh is requested
    if force_refresh:
        # Bypass cache, get fresh data
        return get_fresh_certificates(current_user.id, db)  # Remove await here
    
    # Normal caching behavior
    """Get user certificates with Redis caching."""
    user_id = current_user.id
    
    # Check if user has premium access for downloading
    subscription_service = SubscriptionService(db)
    feature_check = subscription_service.can_use_feature(user_id, "download_certificate")
    
    print(f"DEBUG: User {user_id} certificate access check: {feature_check}")
    
    # Get all user's sessions with their questions
    sessions = db.query(DBSession).filter(
        DBSession.user_id == user_id
    ).all()
    
    certificates = []
    
    for session in sessions:
        print(f"DEBUG: Processing session {session.id} - Difficulty: {session.difficulty}")
        
        # Get questions for this session from SessionQuestion table
        session_questions = db.query(SessionQuestion).filter(
            SessionQuestion.session_id == session.id
        ).all()
        
        # Calculate score percentage - only count answered questions
        total_questions = len(session_questions)
        answered_questions = [q for q in session_questions if q.user_sql is not None]
        correct_questions = sum(1 for q in answered_questions if q.is_correct)

        # Use answered questions for score calculation
        score_percentage = (correct_questions / len(answered_questions) * 100) if len(answered_questions) > 0 else 0

        print(f"🔍 DEBUG: Session {session.id} - Total questions: {total_questions}, Answered: {len(answered_questions)}, Correct: {correct_questions}, Score: {score_percentage}%")

        # Only give certificate for sessions where user actually answered questions
        if len(answered_questions) > 0:
            cert = {
                "id": session.id,
                "session_id": session.id,
                "title": f"{session.difficulty.title() if session.difficulty else 'Basic'} SQL Practice Session",
                "difficulty": session.difficulty or "basic",
                "score": round(score_percentage, 1),  # This is what frontend displays as percentage
                "total_points": len(answered_questions),  # Use answered questions count
                "correct_answers": correct_questions,
                "completion_date": session.created_at.isoformat(),
                "topic": session.difficulty.title() if session.difficulty else "General",
                "certificate_url": f"/api/achievements/certificate/{session.id}",
                "type": "session"
            }
            certificates.append(cert)
            print(f"🔍 DEBUG: Added certificate for session {session.id} with score {score_percentage}%")
        else:
            print(f"🔍 DEBUG: Session {session.id} has no answered questions")
    
    print(f"DEBUG: Returning {len(certificates)} certificates")
    
    # Return certificates for all users, but indicate upgrade requirement for downloading
    return {
        "certificates": certificates,
        "requires_upgrade": not feature_check["allowed"],
        "user_plan": feature_check.get("current_plan", "free")
    }

@router.get("/competition-certificates")
async def get_user_competition_certificates(
    current_user: Any = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all competition certificates for the current user."""
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    try:
        # Get all completed competitions for the user
        competitions = db.query(Competition).filter(
            Competition.user_id == current_user.id,
            Competition.status == 'completed'
        ).order_by(Competition.completed_at.desc()).all()
        
        certificates = []
        for comp in competitions:
            # Calculate performance metrics
            user_score = comp.user_score or 0
            ai_score = comp.ai_score or 0
            total_rounds = 5  # Default to 5 rounds
            
            performance = "Excellent" if user_score >= 4 else "Good" if user_score >= 3 else "Fair"
            win_status = "Winner" if user_score > ai_score else "Runner Up" if user_score == ai_score else "Participant"
            
            certificate_data = {
                "id": comp.id,
                "type": "competition",
                "competition_id": comp.id,
                "user_score": user_score,
                "ai_score": ai_score,
                "difficulty": comp.difficulty.capitalize() if comp.difficulty else "Basic",
                "total_rounds": total_rounds,
                "completion_date": comp.completed_at.isoformat() if comp.completed_at else datetime.utcnow().isoformat(),
                "user_name": current_user.email or current_user.username,
                "certificate_id": f"CERT_{comp.id[:8].upper()}",
                "performance": performance,
                "win_status": win_status,
                "rounds_won": user_score,
                "rounds_total": total_rounds,
                "success_rate": f"{(user_score / total_rounds) * 100:.0f}%",
                "title": f"SQL Competition - {comp.difficulty.capitalize() if comp.difficulty else 'Basic'}",
                "topic": "Competition",
                "certificate_url": f"/api/achievements/competition-certificate/{comp.id}"
            }
            certificates.append(certificate_data)
        
        return {
            "success": True,
            "certificates": certificates,
            "total_count": len(certificates)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch competition certificates: {str(e)}")

@router.get("/certificate/{session_id}")
async def get_certificate(
    session_id: str,
    db=Depends(get_db),
    current_user: Any = Depends(get_current_user)
):
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    # Check subscription allows certificate download
    subscription_service = SubscriptionService(db)
    feature_check = subscription_service.can_use_feature(current_user.id, "download_certificate")

    if not feature_check["allowed"]:
        raise HTTPException(
            status_code=403, 
            detail=feature_check["reason"]
        )

    # Get the session and validate it belongs to the user
    session = db.query(DBSession).filter(
        DBSession.id == session_id,
        DBSession.user_id == current_user.id
    ).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Get questions for this session from SessionQuestion table
    session_questions = db.query(SessionQuestion).filter(
        SessionQuestion.session_id == session_id
    ).all()
    
    if not session_questions or len(session_questions) == 0:
        raise HTTPException(status_code=400, detail="No questions found in this session")
    
    # Calculate session stats - only count answered questions
    total_questions = len(session_questions)
    answered_questions = [q for q in session_questions if q.user_sql is not None]
    correct_answers = sum(1 for q in answered_questions if q.is_correct)
    
    # Use answered questions for score calculation
    score_percentage = (correct_answers / len(answered_questions) * 100) if len(answered_questions) > 0 else 0
    
    # Generate certificate data
    certificate_data = {
        "certificate_id": f"CERT_{session_id}",
        "user_name": current_user.name,
        "session_id": session_id,
        "difficulty": session.difficulty or "basic",
        "score": int(score_percentage),
        "total_questions": len(answered_questions),  # Use answered questions count
        "correct_answers": correct_answers,
        "completion_date": session.completed_at.strftime("%B %d, %Y") if session.completed_at else session.created_at.strftime("%B %d, %Y"),
        "topic": session.difficulty.title() if session.difficulty else "SQL Practice",
    }
    
    return certificate_data

@router.get("/competition-certificate/{competition_id}")
async def get_competition_certificate(
    competition_id: str,
    db=Depends(get_db),
    current_user: Any = Depends(get_current_user)
):
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    # Check subscription allows certificate download
    subscription_service = SubscriptionService(db)
    feature_check = subscription_service.can_use_feature(current_user.id, "download_certificate")

    if not feature_check["allowed"]:
        raise HTTPException(
            status_code=403, 
            detail=feature_check["reason"]
        )

    # Get the competition and validate it belongs to the user
    competition = db.query(Competition).filter(
        Competition.id == competition_id,
        Competition.user_id == current_user.id,
        Competition.status == 'completed'
    ).first()
    
    if not competition:
        raise HTTPException(status_code=404, detail="Competition not found or not completed")
    
    # Calculate competition stats
    user_score = competition.user_score or 0
    ai_score = competition.ai_score or 0
    total_rounds = 5  # Default to 5 rounds
    
    # Determine performance rating
    if user_score >= 4:
        performance = "Excellent"
    elif user_score >= 3:
        performance = "Good"
    else:
        performance = "Fair"
    
    # Determine win status
    if user_score > ai_score:
        win_status = "Winner"
    elif user_score == ai_score:
        win_status = "Runner Up"
    else:
        win_status = "Participant"
    
    # Generate certificate data
    certificate_data = {
        "certificate_id": f"COMP_CERT_{competition_id[:8].upper()}",
        "user_name": current_user.name or current_user.username,
        "competition_id": competition_id,
        "difficulty": competition.difficulty.capitalize() if competition.difficulty else "Basic",
        "user_score": user_score,
        "ai_score": ai_score,
        "total_rounds": total_rounds,
        "rounds_won": user_score,
        "success_rate": f"{(user_score / total_rounds) * 100:.0f}%",
        "performance": performance,
        "win_status": win_status,
        "completion_date": competition.completed_at.strftime("%B %d, %Y") if competition.completed_at else datetime.utcnow().strftime("%B %d, %Y"),
        "topic": f"SQL Competition - {competition.difficulty.capitalize() if competition.difficulty else 'Basic'}",
        "result": "win" if user_score > ai_score else "lose" if user_score < ai_score else "tie"
    }
    
    return certificate_data

