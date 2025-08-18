"""
Competition routes for SQL Trainer AI backend.
Handles User vs AI SQL competitions with binary win/lose outcomes.
"""

from fastapi import APIRouter, Depends, HTTPException
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import uuid
import time
import duckdb
import os
import random
from models.database import Competition, CompetitionRound
from models.schemas import (
    CompetitionStartRequest, CompetitionStartResponse,
    CompetitionResultResponse, CompetitionResultRequest,
    CompetitionHistoryResponse, AICompetitionRequest, AICompetitionResponse,isCorrectCompResponse, HumanIsCorrectRequest, AIIsCorrectRequest, WinnerExplanationRequest, WinnerExplanationResponse
)
from routes.auth import get_current_user, get_db, get_model_for_user
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
    tables_rows = temp_conn.execute("SELECT * FROM information_schema.tables").fetchall()
    tables_columns = [desc[0] for desc in temp_conn.description]
    tables_str = "information_schema.tables:\n"
    tables_str += "\t" + "\t".join(tables_columns) + "\n"
    for row in tables_rows:
        tables_str += "\t" + "\t".join(str(col) for col in row) + "\n"

    # Get information_schema.columns
    columns_rows = temp_conn.execute("SELECT * FROM information_schema.columns").fetchall()
    columns_columns = [desc[0] for desc in temp_conn.description]
    columns_str = "information_schema.columns:\n"
    columns_str += "\t" + "\t".join(columns_columns) + "\n"
    for row in columns_rows:
        columns_str += "\t" + "\t".join(str(col) for col in row) + "\n"

    # Combine all into a single schema_ddl string
    schema_ddl = tables_str + "\n" + columns_str
    
    # Close temporary connection
    temp_conn.close()

    # Generate questions using the AI agent
    questions = await competition_question_gen_agent(schema=schema_ddl, difficulty=request.difficulty)
    
    # Check subscription limits
    subscription_service = SubscriptionService(db)
    feature_check = subscription_service.can_use_feature(current_user.id, "competition")
    
    if not feature_check["allowed"]:
        raise HTTPException(status_code=403, detail=feature_check["reason"])
    
    # Generate competition ID and calculate timing
    competition_id = str(uuid.uuid4())
    started_at = datetime.utcnow()
    expires_at = started_at + timedelta(seconds=180)  # 3 minutes total
    
    # Create initial competition record using the new Competition model
    competition = Competition(
        id=competition_id,
        user_id=current_user.id,
        difficulty=request.difficulty,
        schema_ddl=schema_ddl,
        questions=questions,
        total_rounds=5,
        current_round=1,
        time_limit=180,  # 3 minutes total
        ai_time_limit=30,  # 30 seconds per question
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
        questions=questions,
        total_rounds=5,
        current_round=1,
        time_limit=180,
        ai_time_limit=30,
        started_at=started_at,
        expires_at=expires_at,
        status='active'
    )


@router.get("/round-result", response_model=WinnerExplanationResponse)
async def get_competition_result(
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
        explanation = request.ai_explanation
        correct_sql = request.ai_sql
    elif not request.ai_iscorrect and request.human_iscorrect:
        winner = "human"
        explanation = request.human_explanation
        correct_sql = request.human_sql
    elif request.ai_iscorrect and request.human_iscorrect:
        winner = "both"
        explanation = request.human_explanation
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

    return WinnerExplanationResponse(
        competition_id=request.competition_id,
        round=request.round,
        winner=winner,
        correct_sql=correct_sql,
        explanation=explanation
    )


@router.get("/human-iscorrect", response_model=isCorrectCompResponse)
async def check_human_response(
    request: HumanIsCorrectRequest,
    current_user: Any = Depends(get_current_user),
    db: Session = Depends(get_db),
    conn = Depends(lambda request: get_competition_duckdb_conn(request.competition_id))
):
    """Check if human response is correct for a competition round."""
    response_type = 'human'
    is_executable = False
    is_correct = False
    in_time = request.time_limit > request.response_time
    result = ''
    explanation = ''
    points = 0
    round_num = request.round
    difficulty_multiplier = {'basic': 1, "intermediate": 2, "advanced": 4}

    with dspy.context(lm=dspy.LM('openai/gpt-4o-mini'), max_tokens=5000):
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


@router.get("/ai-iscorrect", response_model=isCorrectCompResponse)
async def check_ai_response(
    request: AIIsCorrectRequest,
    current_user: Any = Depends(get_current_user),
    db: Session = Depends(get_db),
    conn = Depends(lambda request: get_competition_duckdb_conn(request.competition_id))
):
    """Check if AI response is correct for a competition round."""
    response_type = 'ai'
    is_executable = False
    is_correct = False
    in_time = request.time_limit > request.response_time
    result = ''
    explanation = ''
    points = 0
    round_num = request.round
    difficulty_multiplier = {'basic': 1, "intermediate": 2, "advanced": 4}

    with dspy.context(lm=dspy.LM('openai/gpt-4o-mini'), max_tokens=5000):
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
                round_record.ai_sql = request.sql
                round_record.ai_correct = False
                round_record.explanation = explanation
                round_record.ai_response_time = request.response_time
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
                round_record.ai_sql = request.sql
                round_record.ai_correct = is_correct
                round_record.ai_points = points if is_correct else 0
                round_record.explanation = explanation
                round_record.ai_response_time = request.response_time
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


@router.post("/ai-response", response_model=AICompetitionResponse)
async def get_ai_response(
    request: AICompetitionRequest,
    current_user: Any = Depends(get_current_user),
    db: Session = Depends(get_db),
    conn = Depends(lambda request: get_competition_duckdb_conn(request.competition_id))
):
    """Get AI's competitive response to the same question."""
    
    # Verify competition exists
    competition = db.query(Competition).filter(
        Competition.competition_id == request.competition_id,
        Competition.user_id == current_user.id
    ).first()
    
    if not competition:
        raise HTTPException(status_code=404, detail="Competition not found")
    
    # Simulate AI generating SQL query within time limit
    start_time = time.time()
    
    # Generate AI's competitive response based on the question and schema
    response = await ai_competitor_agent(question=request.question, schema=request.schema_ddl, difficulty=request.difficulty, conn=conn)
    
    end_time = time.time()
    time_taken_ms = int((end_time - start_time) * 1000)  # milliseconds
    in_time = time_taken_ms <= (request.time_limit * 1000)
    
    # Update the competition record with AI's response
    competition.ai_queries = [response.sql]
    competition.ai_score = DIFFICULTY_POINTS[request.difficulty] if in_time else 0
    db.commit()
    
    return AICompetitionResponse(
        competition_id=request.competition_id,
        answer=response.sql,
        difficulty=request.difficulty,
        in_time=in_time
    )


@router.post("/final-result", response_model=CompetitionResultResponse)
async def submit_competition(
    request: CompetitionResultRequest,
    current_user: Any = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Submit user's query for the competition and get final result."""
    competition = db.query(Competition).filter(
        Competition.competition_id == request.competition_id,
        Competition.user_id == current_user.id
    ).first()

    if not competition:
        raise HTTPException(status_code=404, detail="Competition not found")

    # Calculate total points from all rounds
    rounds = db.query(CompetitionRound).filter(
        CompetitionRound.competition_id == request.competition_id
    ).all()
    
    user_points = sum(round.user_points for round in rounds)
    ai_points = sum(round.ai_points for round in rounds)
    
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
        competition_id=competition.competition_id,
        final_result=final_result,
        user_points=user_points,
        ai_points=ai_points,
        rounds_data=rounds_data,
        can_get_certificate=can_get_certificate,
        certificate_message=certificate_message,
        schema_ddl=competition.schema_ddl,
        questions=competition.questions
    )


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
            competition_id=c.competition_id,
            difficulty=c.difficulty,
            score=c.user_score,
            result=c.result,
            completed_at=c.completed_at,
            total_time_taken=c.total_time_taken,
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