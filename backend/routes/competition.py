"""
Competition routes for SQL Trainer AI backend.
Handles User vs AI SQL competitions with binary win/lose outcomes.
"""

from fastapi import APIRouter, Depends, HTTPException
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import uuid
import time
import duckdb
import os
import random
from models.database import Competition, CompetitionRound
from models.schemas import (
    CompetitionStartRequest, CompetitionStartResponse,CompetitionQuestion,
    CompetitionResultResponse, CompetitionResultRequest,
    CompetitionHistoryResponse, AICompetitionRequest, AICompetitionResponse,isCorrectCompResponse, HumanIsCorrectRequest, AIIsCorrectRequest, WinnerExplanationRequest, WinnerExplanationResponse
)
from routes.auth import get_current_user, get_db, get_model_for_user, default_lm
from utils.subscription_service import SubscriptionService
from utils.agents import ai_competitor_agent
import threading 
router = APIRouter(prefix="/api/competition", tags=["Competition"])
from utils.agents import competition_question_gen_agent, check_correct_agent, explanation_gen_agent, both_wrong_explanation_agent
import dspy


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
    Returns a persistent DuckDB connection for the given competition_id.
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

    # Load all .duckdb files from the competition schemas folder and pick one randomly
    # Get the backend directory path
    backend_dir = os.path.dirname(os.path.dirname(__file__))
    schemas_dir = os.path.join(backend_dir, "competition_schemas")
    duckdb_files = [f for f in os.listdir(schemas_dir) if f.endswith(".duckdb")]
    if not duckdb_files:
        raise HTTPException(status_code=500, detail="No competition schemas available.")
    
    selected_schema_file = random.choice(duckdb_files)
    selected_schema_path = os.path.join(schemas_dir, selected_schema_file)
    
    # Create a temporary DuckDB connection to get schema information
    temp_conn = duckdb.connect(database=selected_schema_path)

    
    # Get the DDL (CREATE TABLE statements) for all tables in the selected schema
    # Get all table names in the schema
    table_names = [row[0] for row in temp_conn.execute("SHOW TABLES").fetchall()]
    ddl_list =[]
    num_tables = len(table_names)
    print(f"Number of tables in selected schema: {num_tables}")
    if num_tables == 0:
        raise HTTPException(status_code=500, detail="Selected schema has no tables or data.")
    for table in table_names:
        # Get the schema for each table using DESCRIBE
        describe_result = temp_conn.execute(f"DESCRIBE {table}").fetchdf()
        # Build a CREATE TABLE statement from the DESCRIBE output
        columns = []
        for _, row in describe_result.iterrows():
            col_name = row['column_name']
            col_type = row['column_type']
            columns.append(f'"{col_name}" {col_type}')
        create_stmt = f'CREATE TABLE "{table}" (\n  ' + ',\n  '.join(columns) + '\n);'
        ddl_list.append(create_stmt)
    tables_str = "\n\n".join(ddl_list)

    # Combine all into a single schema_ddl string
    schema_ddl = tables_str 
    
    # Close temporary connection


    # Generate questions using the AI agent
    with dspy.context(lm = default_lm):
        questions = await competition_question_gen_agent(schema=schema_ddl, difficulty=request.difficulty)
        
    questions = questions.questions
    if not questions:
        raise HTTPException(status_code=500, detail="No questions generated for this competition.")
    
    # Check subscription limits
    subscription_service = SubscriptionService(db)
    feature_check = subscription_service.can_use_feature(current_user.id, "competition")
    
    if not feature_check["allowed"]:
        raise HTTPException(status_code=403, detail=feature_check["reason"])
    
    # Generate competition ID and calculate timing
    competition_id = str(uuid.uuid4())
    started_at = datetime.utcnow()
    expires_at = started_at + timedelta(seconds=180)  # 3 minutes total
    # Create a new DuckDB database for the competition, copying all tables from temp_conn
    competition_db_path = f"db_{competition_id}.duckdb"
    conn = duckdb.connect(database=competition_db_path)
    for table in table_names:
        # Copy each table from temp_conn to conn
        df = temp_conn.execute(f"SELECT * FROM \"{table}\"").fetchdf()
        conn.execute(f"CREATE TABLE \"{table}\" AS SELECT * FROM df")


    conn.commit()
    # Create initial competition record using the new Competition model
    competition = Competition(
        id=competition_id,
        user_id=current_user.id,
        difficulty=request.difficulty,
        schema_ddl=schema_ddl,
        questions=[
            {
                "round": i+1,
                "question": q,
                "difficulty": request.difficulty
            } for i, q in enumerate(questions)
        ],  # Convert to dictionaries here too
        total_rounds=5,
        current_round=1,
        time_limit=180,
        ai_time_limit=30,
        started_at=started_at,
        expires_at=expires_at,
        status='active'
    )
    
    db.add(competition)
    db.commit()
    
    # Create CompetitionRound records for each question
    for i, question in enumerate(questions, 1):
        round_data = CompetitionRound(
            competition_id=competition_id,
            round_number=i,
            question=question,
            difficulty=request.difficulty
        )
        db.add(round_data)
    
    db.commit()
    
    # Increment usage
    subscription_service.increment_usage(current_user.id, "competition")
    
    return CompetitionStartResponse(
        competition_id=competition_id,
        difficulty=request.difficulty,
        schema_ddl=schema_ddl,
        questions=[
            {
                "round": i+1,
                "question": q,
                "difficulty": request.difficulty
            } for i, q in enumerate(questions)
        ],  # Convert to dictionaries
        total_rounds=5,
        current_round=1,
        time_limit=180,
        ai_time_limit=30,
        started_at=started_at,
        expires_at=expires_at,
        status='active'
    )


@router.post("/round-result", response_model=WinnerExplanationResponse)
async def get_round_result(
    request: WinnerExplanationRequest,
    current_user: Any = Depends(get_current_user),
    db: Session = Depends(get_db),
    lm: dspy.LM = Depends(lambda db=Depends(get_db), current_user=Depends(get_current_user): get_model_for_user(current_user.id, db))
):
    """Get final results of a completed competition round."""
    explanation = ''
    winner = ''
    correct_sql = ''
    
    if request.ai_iscorrect and not request.human_iscorrect:
        winner = "ai"
        explanation = f"Why AI was correct: {request.ai_explanation} Why you were wrong: {request.human_explanation}"
        correct_sql = request.ai_sql
    elif not request.ai_iscorrect and request.human_iscorrect:
        winner = "human"
        explanation = f"Why you were correct: {request.human_explanation} Why AI was wrong: {request.ai_explanation}"

        correct_sql = request.human_sql
    elif request.ai_iscorrect and request.human_iscorrect:
        winner = "both"
        explanation = f"Why you were correct: {request.human_explanation} Why AI was also correct: {request.ai_explanation}"
        correct_sql = request.human_sql
    else:
        winner = "none"
        with dspy.context(lm=lm):
            response = await both_wrong_explanation_agent(
                question=request.question,
                human_wrong_explanation=request.human_explanation,
                ai_wrong_explanation=request.ai_explanation
            )
            explanation = response.explanation
            correct_sql = response.correct_sql

    # Update the CompetitionRound record with results
    round_record = db.query(CompetitionRound).filter(
        CompetitionRound.competition_id == request.competition_id,
        CompetitionRound.round_number == request.round
    ).first()
    
    if round_record:
        round_record.user_sql = request.human_sql
        round_record.ai_sql = request.ai_sql
        round_record.user_correct = request.human_iscorrect
        round_record.ai_correct = request.ai_iscorrect
        round_record.correct_answer = correct_sql
        round_record.explanation = explanation
        
        # Calculate points based on difficulty
        difficulty_multiplier = {'basic': 1, 'intermediate': 2, 'advanced': 4}
        if request.human_iscorrect:
            round_record.user_points = difficulty_multiplier.get(request.difficulty.lower(), 1)
        if request.ai_iscorrect:
            round_record.ai_points = difficulty_multiplier.get(request.difficulty.lower(), 1)
        
        db.commit()
        
        # REMOVED: Don't update competition scores here - do it at final-result instead

    
    return WinnerExplanationResponse(
        competition_id=request.competition_id,
        round=request.round,
        winner=winner,
        correct_sql=correct_sql,
        explanation=explanation
    )


@router.post("/human-iscorrect", response_model=isCorrectCompResponse)
async def check_human_response(
    request: HumanIsCorrectRequest,
    current_user: Any = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Check if human response is correct for a competition round."""
    # Connect to the DuckDB database for this competition
    conn = get_competition_duckdb_conn(request.competition_id)
    # Check if tables are loaded in the DuckDB connection
    try:
        loaded_tables = [row[0] for row in conn.execute("SHOW TABLES").fetchall()]
        if not loaded_tables:
            raise HTTPException(status_code=500, detail="No tables loaded in the competition database.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error checking tables in competition database: {str(e)}")
    response_type = 'human'
    is_executable = False
    is_correct = False
    in_time = request.time_limit > request.response_time
    result = ''
    explanation = ''
    points = 0
    round_num = request.round
    difficulty_multiplier = {'basic': 1, "intermediate": 2, "advanced": 4}

    with dspy.context(lm=default_lm):
        try:
            result = conn.execute(request.sql).fetchdf().head().to_markdown(index=False)
            is_executable = True
        except Exception as e:
            explanation = await explanation_gen_agent(error_generated=str(e)[:400], faulty_sql=request.sql)
            explanation = explanation.explanation
            
            # Update the round record with error information
            round_record = db.query(CompetitionRound).filter(
                CompetitionRound.competition_id == request.competition_id,
                CompetitionRound.round_number == round_num
            ).first()
            if round_record:
                round_record.user_sql = request.sql
                round_record.user_correct = False
                round_record.explanation = explanation
                round_record.user_response_time = request.response_time
                db.commit()
            
            return isCorrectCompResponse(
                competition_id=request.competition_id,
                response_type=response_type,
                is_executable=is_executable,
                is_correct=is_correct,
                in_time=in_time,
                round=round_num,
                points=points,
                result=result,
                explanation=explanation
            )
        
        if is_executable:
            response = await check_correct_agent(question=request.question, sql=request.sql, table_head=result)
            is_correct = response.is_correct
            if is_correct:
                explanation = response.explanation
            else:
                explanation = await explanation_gen_agent(error_generated=response.explanation, faulty_sql=request.sql)
                explanation = explanation.explanation

            points = difficulty_multiplier.get(request.difficulty.lower(), 1)
            
            # Update the round record with results
            round_record = db.query(CompetitionRound).filter(
                CompetitionRound.competition_id == request.competition_id,
                CompetitionRound.round_number == round_num
            ).first()
            if round_record:
                round_record.user_sql = request.sql
                round_record.user_correct = is_correct
                round_record.user_points = points if is_correct else 0
                round_record.explanation = explanation
                round_record.user_response_time = request.response_time
                db.commit()
            
            return isCorrectCompResponse(
                competition_id=request.competition_id,
                response_type=response_type,
                is_executable=is_executable,
                is_correct=is_correct,
                in_time=in_time,
                round=round_num,
                points=points,
                result=result,
                explanation=explanation
            )


@router.post("/ai-iscorrect", response_model=isCorrectCompResponse)
async def check_ai_response(
    request: AIIsCorrectRequest,
    current_user: Any = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Check if AI response is correct for a competition round (uses cached result)."""
    # Get the stored AI SQL and correctness from the database
    round_record = db.query(CompetitionRound).filter(
        CompetitionRound.competition_id == request.competition_id,
        CompetitionRound.round_number == request.round
    ).first()
    
    if not round_record or not round_record.ai_sql:
        raise HTTPException(status_code=404, detail="AI response not found for this round")
    
    # Use cached results instead of re-computing
    ai_sql = round_record.ai_sql
    is_correct = round_record.ai_correct
    explanation = round_record.explanation
    points = round_record.ai_points or 0
    is_executable = round_record.ai_sql is not None  # If we have SQL, it was executable
    
    # If we don't have cached correctness, compute it now (fallback)
    if round_record.ai_correct is None:
        print(f"⚠️ No cached correctness for round {request.round}, computing now...")
        conn = get_competition_duckdb_conn(request.competition_id)
        difficulty_multiplier = {'basic': 1, "intermediate": 2, "advanced": 4}
        
        try:
            result = conn.execute(ai_sql).fetchdf().head().to_markdown(index=False)
            is_executable = True
            
            correctness_response = await check_correct_agent(
                question=request.question, 
                sql=ai_sql, 
                table_head=result
            )
            is_correct = correctness_response.is_correct
            
            if is_correct:
                explanation = correctness_response.explanation
            else:
                explanation_response = await explanation_gen_agent(
                    error_generated=correctness_response.explanation, 
                    faulty_sql=ai_sql
                )
                explanation = explanation_response.explanation
            
            points = difficulty_multiplier.get(request.difficulty.lower(), 1) if is_correct else 0
            
            # Cache the result for future use
            round_record.ai_correct = is_correct
            round_record.ai_points = points
            round_record.explanation = explanation
            db.commit()
            
        except Exception as e:
            explanation_response = await explanation_gen_agent(
                error_generated=str(e)[:400], 
                faulty_sql=ai_sql
            )
            explanation = explanation_response.explanation
            is_correct = False
            points = 0
            
            # Cache the error result
            round_record.ai_correct = False
            round_record.ai_points = 0
            round_record.explanation = explanation
            db.commit()
    
    print(f"🚀 Returning cached AI correctness: {is_correct}, points: {points}")
    
    return isCorrectCompResponse(
        competition_id=request.competition_id,
        response_type='ai',
        is_executable=is_executable,
        is_correct=is_correct,
        in_time=True,  # AI responses are always "in time"
        round=request.round,
        points=points,
        result='',  # We don't need to return the actual result here
        explanation=explanation,
        ai_sql=ai_sql
    )


@router.post("/ai-response", response_model=AICompetitionResponse)
async def generate_ai_response(
    request: AICompetitionRequest,
    current_user: Any = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Generate and store AI's competitive response with immediate correctness caching."""
    conn = get_competition_duckdb_conn(request.competition_id)
    
    # Verify competition exists
    competition = db.query(Competition).filter(
        Competition.id == request.competition_id,
        Competition.user_id == current_user.id
    ).first()
    
    if not competition:
        raise HTTPException(status_code=404, detail="Competition not found")
    
    # Generate AI's competitive response
    start_time = time.time()
    response = await ai_competitor_agent(
        question=request.question, 
        schema=request.schema_ddl, 
        difficulty=request.difficulty, 
        conn=conn
    )
    end_time = time.time()
    
    time_taken_ms = int((end_time - start_time) * 1000)
    in_time = time_taken_ms <= (request.time_limit * 1000)
    
    ai_sql = response['sql']
    
    # Store AI response in CompetitionRound
    round_record = db.query(CompetitionRound).filter(
        CompetitionRound.competition_id == request.competition_id,
        CompetitionRound.round_number == request.round
    ).first()
    
    if round_record:
        round_record.ai_sql = ai_sql
        round_record.ai_response_time = time_taken_ms
        db.commit()
    
    # CACHE AI CORRECTNESS IMMEDIATELY
    # This eliminates the need to re-compute correctness later
    try:
        # Check if SQL is executable
        result = conn.execute(ai_sql).fetchdf().head().to_markdown(index=False)
        is_executable = True
        
        # Check if answer is correct
        correctness_response = await check_correct_agent(
            question=request.question, 
            sql=ai_sql, 
            table_head=result
        )
        is_correct = correctness_response.is_correct
        
        if is_correct:
            explanation = correctness_response.explanation
        else:
            explanation_response = await explanation_gen_agent(
                error_generated=correctness_response.explanation, 
                faulty_sql=ai_sql
            )
            explanation = explanation_response.explanation
        
        # Calculate points
        difficulty_multiplier = {'basic': 1, "intermediate": 2, "advanced": 4}
        points = difficulty_multiplier.get(request.difficulty.lower(), 1) if is_correct else 0
        
        # Update the round record with ALL results (including correctness)
        if round_record:
            round_record.ai_sql = ai_sql
            round_record.ai_correct = is_correct
            round_record.ai_points = points
            round_record.explanation = explanation
            round_record.ai_response_time = time_taken_ms
            db.commit()
            
        print(f"✅ AI response cached with correctness: {is_correct}, points: {points}")
        
    except Exception as e:
        # Handle SQL execution errors
        explanation_response = await explanation_gen_agent(
            error_generated=str(e)[:400], 
            faulty_sql=ai_sql
        )
        explanation = explanation_response.explanation
        
        # Update the round record with error information
        if round_record:
            round_record.ai_sql = ai_sql
            round_record.ai_correct = False
            round_record.explanation = explanation
            round_record.ai_response_time = time_taken_ms
            db.commit()
        
        print(f"❌ AI response cached with error: {str(e)[:100]}")
    
    return AICompetitionResponse(
        competition_id=request.competition_id,
        answer=ai_sql,
        difficulty=request.difficulty,
        round=request.round, 
        in_time=in_time
    )


@router.get("/ai-response/{competition_id}/{round}")
async def get_stored_ai_response(
    competition_id: str,
    round: int,
    current_user: Any = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get the stored AI response for a specific round."""
    # Get the stored AI response from CompetitionRound
    round_record = db.query(CompetitionRound).filter(
        CompetitionRound.competition_id == competition_id,
        CompetitionRound.round_number == round
    ).first()
    
    if not round_record or not round_record.ai_sql:
        raise HTTPException(status_code=404, detail="AI response not found for this round")
    
    return {
        "competition_id": competition_id,
        "round": round,
        "ai_sql": round_record.ai_sql,
        "ai_response_time": round_record.ai_response_time
    }


@router.post("/final-result", response_model=CompetitionResultResponse)
async def submit_competition(
    request: CompetitionResultRequest,
    current_user: Any = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Submit user's query for the competition and get final result."""
    competition = db.query(Competition).filter(
        Competition.id == request.competition_id,
        Competition.user_id == current_user.id
    ).first()

    if not competition:
        raise HTTPException(status_code=404, detail="Competition not found")

    # Calculate total points from all rounds
    rounds = db.query(CompetitionRound).filter(
        CompetitionRound.competition_id == request.competition_id
    ).all()
    
    # Calculate final scores from all rounds
    user_points = sum(round.user_points for round in rounds if round.user_points is not None)
    ai_points = sum(round.ai_points for round in rounds if round.ai_points is not None)
    
    print(f"Final competition scores calculated: User={user_points}, AI={ai_points}")
    print(f"Rounds data: {[(r.round_number, r.user_points, r.ai_points) for r in rounds]}")
    
    # Update competition with final scores
    competition.user_score = user_points
    competition.ai_score = ai_points
    competition.completed_at = datetime.utcnow()
    competition.status = 'completed'

    # Determine final result
    if user_points > ai_points:
        final_result = "win"
        can_get_certificate = True
        certificate_message = "Congratulations! You won the competition and earned a certificate!"
    elif user_points < ai_points:
        final_result = "lose"
        can_get_certificate = False
        certificate_message = "The AI won this time. Review your answers and try again!"
    else:
        final_result = "tie"
        can_get_certificate = False
        certificate_message = "It's a tie! Great effort from both sides."

    competition.result = final_result
    db.commit()

    # --- Additional functionality: Mark competition as completed and update user usage ---
    # This mirrors the logic in complete_competition endpoint (file_context_0)
    # Increment user's competition usage

    subscription_service = SubscriptionService(db)
    subscription_service.increment_usage(current_user.id, "competition")
    # -------------------------------------------------------------------------------

    # Prepare rounds_data from CompetitionRound records
    rounds_data = []
    for round_record in rounds:
        rounds_data.append({
            "round": round_record.round_number,
            "question": round_record.question,
            "user_sql": round_record.user_sql,
            "ai_sql": round_record.ai_sql,
            "user_correct": round_record.user_correct,
            "ai_correct": round_record.ai_correct,
            "user_points": round_record.user_points,
            "ai_points": round_record.ai_points,
            "correct_answer": round_record.correct_answer,
            "explanation": round_record.explanation
        })

    return CompetitionResultResponse(
        competition_id=request.competition_id,
        final_result=final_result,
        user_points=user_points,
        ai_points=ai_points,
        rounds_data=rounds_data,
        can_get_certificate=can_get_certificate,
        certificate_message=certificate_message,
        schema_ddl=competition.schema_ddl,
        questions=[str(q) for q in competition.questions] 
    )

@router.get("/continue-last-competition", response_model=dict)
async def continue_last_competition(user_id: str, db = Depends(get_db)):
    """Continue the user's last incomplete competition (only if they left it unfinished)."""
    try:
        # Get the user's last ACTIVE competition (most recent)
        last_competition = db.query(Competition).filter(
            Competition.user_id == user_id,
            Competition.status == 'active'  # Just check for active status
        ).order_by(Competition.submitted_at.desc()).first()  # Use submitted_at instead of created_at
        
        if not last_competition:
            return {
                "success": False,
                "message": "No active competition found",
                "has_competition": False
            }
        
        # Check if competition has rounds completed
        completed_rounds = db.query(CompetitionRound).filter(
            CompetitionRound.competition_id == last_competition.id
        ).count()
        
        if completed_rounds >= 5:
            return {
                "success": False,
                "message": "Last competition was completed",
                "has_competition": False
            }
        
        # Return competition data for continuation
        return {
            "success": True,
            "message": "Active competition found",
            "has_competition": True,
            "data": {
                "competition_id": last_competition.id,
                "session_id": last_competition.id,  # Use competition ID as session ID
                "status": last_competition.status,
                "current_round": last_competition.current_round,
                "difficulty": last_competition.difficulty,
                "created_at": last_competition.submitted_at.isoformat(),
                "last_activity": last_competition.submitted_at.isoformat()
            }
        }
        
    except Exception as e:
        return {
            "success": False,
            "message": f"Error checking competition: {str(e)}",
            "has_competition": False
        }


@router.get("/history")
async def get_competition_history(
    current_user: Any = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user's competition history."""
    
    competitions = db.query(Competition).filter(
        Competition.user_id == current_user.id,
        Competition.result.isnot(None)  # Only completed competitions
    ).order_by(Competition.completed_at.desc()).all()
    
    history = []
    for c in competitions:
        history.append(CompetitionHistoryResponse(
            competition_id=c.id,
            difficulty=c.difficulty,
            user_score=c.user_score or 0,  # Fix: use user_score instead of score
            ai_score=c.ai_score or 0,      # Fix: add ai_score field
            result=c.result,
            completed_at=c.completed_at,
            total_time_taken=c.total_time_taken or 0,  # Add default value
            questions=c.questions
        ))
    
    return {"competitions": history}


@router.get("/stats")
async def get_competition_stats(
    current_user: Any = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user's competition statistics."""
    
    competitions = db.query(Competition).filter(
        Competition.user_id == current_user.id,
        Competition.result.isnot(None)
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


