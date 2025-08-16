"""
Dashboard routes for SQL Tutor AI backend.
Handles user statistics, progress tracking, and analytics.
"""

from fastapi import APIRouter, Depends, HTTPException
from typing import Dict, Any, List
from sqlalchemy.orm import Session
from datetime import datetime, timedelta

from models.schemas import DashboardStatsResponse, ProgressResponse, CompetitionHistoryResponse
from routes.auth import get_current_user, get_db
from models.database import Session as DBSession
from models.database import CompetitionSubmission
from utils.subscription_service import SubscriptionService

router = APIRouter(prefix="/api/achievements", tags=["Achievements"])

# Fix the average score calculation
@router.get("/stats", response_model=DashboardStatsResponse)
async def get_dashboard_stats(
    current_user: Any = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user_id = current_user.id

    # Calculate average score from individual query results, not total_score
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
            current_streak=0,
            best_rank=None
        )

    for session in sessions:
        if session.queries:
            for query in session.queries:
                if isinstance(query, dict):
                    total_queries += 1
                    if query.get("is_correct"):
                        total_correct += 1

    average_score = round((total_correct / total_queries * 100), 2) if total_queries > 0 else 0.0

    # Total practice sessions
    total_practice_sessions = db.query(DBSession).filter(DBSession.user_id == user_id).count()

    # Total competitions participated
    total_competitions = db.query(CompetitionSubmission).filter(CompetitionSubmission.user_id == user_id).count()

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

    # For new users, both lists will be empty, which is correct
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
    return {
        "is_eligible": True,
        "stats": {
            "overall_accuracy": 100.0,
            "total_queries": 42,
            "correct_queries": 42,
            "sessions_completed": {
                "basic": 10,
                "intermediate": 5,
                "advanced": 2
            }
        },
        "requirements": {
            "minimum_accuracy": 70,
            "basic_sessions": 10,
            "intermediate_sessions": 5,
            "advanced_sessions": 2
        }
    }
    # --- END DUMMY TESTING RESPONSE ---

    # # PRODUCTION LOGIC BELOW (uncomment for real logic)
    # # Get all user's sessions
    # sessions = db.query(DBSession).filter(DBSession.user_id == user_id).all()
    #
    # # Return all 0 stats for new user (no sessions)
    # if not sessions or len(sessions) == 0:
    #     return {
    #         "is_eligible": False,
    #         "stats": {
    #             "overall_accuracy": 0.0,
    #             "total_queries": 0,
    #             "correct_queries": 0,
    #             "sessions_completed": {
    #                 "basic": 0,
    #                 "intermediate": 0,
    #                 "advanced": 0
    #             }
    #         },
    #         "requirements": {
    #             "minimum_accuracy": 70,
    #             "basic_sessions": 10,
    #             "intermediate_sessions": 5,
    #             "advanced_sessions": 2
    #         }
    #     }
    #
    # # Calculate overall stats
    # total_queries = 0
    # correct_queries = 0
    # difficulty_completion = {
    #     "basic": 0,
    #     "intermediate": 0,
    #     "advanced": 0
    # }
    #
    # for session in sessions:
    #     if session.queries:
    #         for query in session.queries:
    #             if isinstance(query, dict):
    #                 total_queries += 1
    #                 if query.get("is_correct"):
    #                     correct_queries += 1
    #
    #     if session.difficulty:
    #         difficulty_completion[session.difficulty] += 1
    #
    # overall_accuracy = (correct_queries / total_queries * 100) if total_queries > 0 else 0
    #
    # # Check eligibility criteria
    # is_eligible = (
    #     overall_accuracy >= 70 and  # At least 70% overall accuracy
    #     difficulty_completion["basic"] >= 10 and  # Completed at least 10 basic sessions
    #     difficulty_completion["intermediate"] >= 5 and  # Completed at least 5 intermediate sessions
    #     difficulty_completion["advanced"] >= 2  # Completed at least 2 advanced sessions
    # )
    #
    # return {
    #     "is_eligible": is_eligible,
    #     "stats": {
    #         "overall_accuracy": round(overall_accuracy, 2),
    #         "total_queries": total_queries,
    #         "correct_queries": correct_queries,
    #         "sessions_completed": {
    #             "basic": difficulty_completion["basic"],
    #             "intermediate": difficulty_completion["intermediate"],
    #             "advanced": difficulty_completion["advanced"]
    #         }
    #     },
    #     "requirements": {
    #         "minimum_accuracy": 70,
    #         "basic_sessions": 10,
    #         "intermediate_sessions": 5,
    #         "advanced_sessions": 2
    #     }
    # }



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

@router.get("/certificates")
async def get_user_certificates(
    current_user: Any = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all certificates earned by the user."""
    user_id = current_user.id
    
    # Check if user has premium access
    subscription_service = SubscriptionService(db)
    feature_check = subscription_service.can_use_feature(user_id, "download_certificate")
    
    print(f"DEBUG: User {user_id} certificate access check: {feature_check}")
    
    if not feature_check["allowed"]:
        print(f"DEBUG: User {user_id} doesn't have premium access")
        raise HTTPException(
            status_code=403, 
            detail="Premium subscription required to access certificates"
        )
    
    # Get all user's sessions
    sessions = db.query(DBSession).filter(
        DBSession.user_id == user_id
    ).all()
    
    print(f"DEBUG: Found {len(sessions)} sessions for user {user_id}")
    
    certificates = []
    for session in sessions:
        print(f"DEBUG: Processing session {session.id}")
        print(f"DEBUG: Session queries: {session.queries}")
        print(f"DEBUG: Session difficulty: {session.difficulty}")
        
        if session.queries and len(session.queries) > 0:
            # Calculate score percentage with better debugging
            total_queries = len(session.queries)
            correct_queries = 0
            
            # Debug each query
            print(f"DEBUG: Analyzing session {session.id} with {total_queries} queries:")
            for i, q in enumerate(session.queries):
                # More robust boolean checking
                is_correct_value = q.get("is_correct") if isinstance(q, dict) else False
                
                # Handle different boolean representations
                if isinstance(is_correct_value, str):
                    is_correct = is_correct_value.lower() in ['true', '1', 'yes']
                elif isinstance(is_correct_value, bool):
                    is_correct = is_correct_value
                else:
                    is_correct = bool(is_correct_value)
                
                correct_queries += 1 if is_correct else 0
                print(f"  Query {i}: is_correct_raw={is_correct_value}, is_correct_parsed={is_correct}")

            score_percentage = (correct_queries / total_queries * 100) if total_queries > 0 else 0
            
            print(f"DEBUG: Session {session.id} - Total: {total_queries}, Correct: {correct_queries}, Score: {score_percentage}%")
            
            if score_percentage >= 70:  # Only sessions with 70%+ accuracy get certificates
                cert = {
                    "id": session.id,
                    "session_id": session.id,
                    "title": f"{session.difficulty.title() if session.difficulty else 'Basic'} SQL Practice Session",
                    "difficulty": session.difficulty or "basic",
                    "score": round(score_percentage, 1),
                    "total_points": total_queries,
                    "correct_answers": correct_queries,
                    "completion_date": session.created_at.isoformat(),
                    "topic": session.difficulty.title() if session.difficulty else "General",
                    "certificate_url": f"/api/achievements/certificate/{session.id}"
                }
                certificates.append(cert)
                print(f"DEBUG: Added certificate for session {session.id} with score {score_percentage}%")
            else:
                print(f"DEBUG: Session {session.id} score {score_percentage}% too low for certificate")
        else:
            print(f"DEBUG: Session {session.id} has no queries")
    
    print(f"DEBUG: Returning {len(certificates)} certificates")
    return {"certificates": certificates}

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
    
    if not session.queries or len(session.queries) == 0:
        raise HTTPException(status_code=400, detail="No completed questions in this session")
    
    # Calculate session stats
    total_questions = len(session.queries)
    correct_answers = sum(1 for q in session.queries if isinstance(q, dict) and q.get("is_correct"))
    score_percentage = (correct_answers / total_questions * 100) if total_questions > 0 else 0
    
    if score_percentage < 70:
        raise HTTPException(status_code=400, detail="Score too low for certificate (minimum 70%)")
    
    # Generate certificate data
    certificate_data = {
        "certificate_id": f"CERT_{session_id}",
        "user_name": current_user.name,
        "session_id": session_id,
        "difficulty": session.difficulty or "basic",
        "score": int(score_percentage),
        "total_questions": total_questions,
        "correct_answers": correct_answers,
        "completion_date": session.created_at.strftime("%B %d, %Y"),
        "topic": session.difficulty.title() if session.difficulty else "SQL Practice"
    }
    
    return certificate_data
