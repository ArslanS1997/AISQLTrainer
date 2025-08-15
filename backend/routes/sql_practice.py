"""
SQL Practice routes for SQL Tutor AI backend.
Handles schema generation, query execution, and practice sessions.
"""

from fastapi import APIRouter, Depends, HTTPException, Request
from utils.subscription_service import SubscriptionService

from typing import List, Dict, Any
from utils.agents import (
    create_schema_agent, populate_table_agent, question_generator_agent, explanation_gen_agent, check_correct_agent, code_rewritter_agent
    , redo_schema_agent
    )

from datetime import datetime
import uuid
import duckdb
# import os
import faker
import re
from routes.auth import get_db

from models.schemas import (
    SQLSchemaRequest, SQLSchemaResponse, SQLExecuteRequest, SQLExecuteResponse,
    SessionResponse, PopulateRequest, QuestionRequest, QuestionResponse, PopSuccess, CheckCorrectRequest, CheckCorrectResponse,
    SessionCreationRequest
)
from routes.auth import get_current_user


router = APIRouter(prefix="/api/sql", tags=["SQL Practice"])


from models import Session as DBSession, Schema as DBSchema

# @router.post('/get-explanation', response_model=ExplanationRequest)
# (No implementation provided in original code)


import threading
# This code sets up a simple in-memory cache (dictionary) to store DuckDB database connections,
# keyed by (user_id, session_id) tuples, so that each user/session pair gets a persistent connection.
# The threading.Lock ensures that access to the cache is thread-safe.
_duckdb_conn_cache = {}
_duckdb_conn_lock = threading.Lock()

def get_duckdb_conn(user_id: str, session_id: str):
    """
    Returns a persistent DuckDB connection for the given user_id and session_id.
    Ensures the same connection object is returned for repeated calls.
    """
    key = (user_id, session_id)
    db_filename = f'db_{user_id}.duckdb'
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

@router.post("/create-session")
async def create_session(
    request: SessionCreationRequest,
    db=Depends(get_db),
    current_user: Any = Depends(get_current_user)
):
    """
    Create a new practice session and commit to DB.
    """
    # --- AUTH DEBUGGING ---
    if not current_user or not getattr(current_user, "id", None):
        raise HTTPException(status_code=401, detail="User not authenticated (create_session)")
    # --- END AUTH DEBUGGING ---
    try:
        user_id = current_user.id
        session_id = request.session_id
        schema_script = request.schema_script
        difficulty = request.difficulty

        if not all([user_id, session_id, schema_script, difficulty]):
            raise HTTPException(status_code=400, detail="Missing required fields")

        created_at = datetime.utcnow().replace(microsecond=0)
        # if not schema_id:
        schema_id = str(uuid.uuid4())
        
        db_schema = DBSchema(
            schema_id=schema_id,
            user_id=user_id,
            schema_script=schema_script,
            created_at=created_at
        )
        db.add(db_schema)
        db.commit()
        db.refresh(db_schema)
        schema_id = db_schema.schema_id

        db_session = DBSession(
            id=session_id,
            user_id=user_id,
            schema_id=schema_id,
            queries=[],
            total_score=0,
            difficulty=request.difficulty,  # Add this line
            created_at=created_at,
            completed_at=None
        )
        db.add(db_session)
        db.commit()
        db.refresh(db_session)
        return {
            "session_id": session_id,
            "user_id": user_id,
            "schema_id": schema_id,
            "schema_script": schema_script,
            "difficulty": difficulty,
            "created_at": created_at,
            "status": "active"
        }

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"create_session error: {str(e)}")



@router.post("/generate-schema", response_model=SQLSchemaResponse)
async def generate_schema(
    request: SQLSchemaRequest,
    db=Depends(get_db),
    current_user: Any = Depends(get_current_user)
):
    """
    Generate schema, store in DB, associate with user.


    """
    # --- AUTH DEBUGGING ---
    if not current_user or not getattr(current_user, "id", None):
        raise HTTPException(status_code=401, detail="User not authenticated (generate-schema)")
    # --- END AUTH DEBUGGING ---
    try:

        user_id = current_user.id
        session_id = request.session_id
        conn = get_duckdb_conn(user_id=user_id, session_id=session_id)
        existing_tables = [row[0] for row in conn.execute("SHOW TABLES").fetchall()]
        for table in existing_tables:
            try:
                conn.execute(f'DROP TABLE IF EXISTS "{table}" CASCADE')
            except Exception:
                pass
        response = await create_schema_agent(user_prompt=request.prompt)
        retry = False
        created_at = datetime.utcnow().replace(microsecond=0)
        try:

            conn.execute(response.schema_sql.replace('```','').replace('\n', ' ').replace('\r', ' '))

        except Exception as e:
            retry = True
            response = await redo_schema_agent(user_query = request.prompt, previous_schema= response.schema_sql, error=str(e)[:200])
            conn.execute(response.schema_sql.replace('```','').replace('\n', ' ').replace('\r', ' '))


        # Check for reserved keywords in table or column names and add 's' if found

        tables = conn.execute("SHOW TABLES").fetchall()
        table_names = [row[0] for row in tables]
        schema_created = len(table_names) > 0

        # Generate a unique schema_id
        schema_id = str(uuid.uuid4())
        
        db_schema = DBSchema(
            schema_id=schema_id,
            user_id=user_id,
            schema_script=response.schema_sql,
            created_at=created_at
        )
        db.add(db_schema)
        db.commit()
        db.refresh(db_schema)

        # returner = 
        return SQLSchemaResponse(
            user_id=user_id,
            session_id=session_id,
            schema_script=response.schema_sql,
            created_at=created_at,
            schema_created=schema_created
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"generate-schema error: {str(e)} + {str(request)} ")

# @router.post("/question-generator", response_model=QuestionResponse)
# async def generate_question(
#     request: QuestionRequest,
#     db = Depends(get_db),
#     current_user: Any = Depends(get_current_user)
# ):
#     # --- AUTH DEBUGGING ---

#     if not hasattr(request, "user_id"):
#         raise HTTPException(status_code=400, detail="Missing user_id in request")

#     try:


#         response = await question_generator_agent(
#             schema=request.schema_ddl,
#             difficulty=request.difficulty,
#             topic=request.topic
#         )
#         questions_list = response.questions
#         return {'user_id':request.user_id, "session_id":request.session_id, "questions":questions_list}

#     except Exception as e:
#         # db.rollback()
#         raise HTTPException(status_code=500, detail=f"question-generator error: {str(e)} + {str(request)})")

@router.post("/question-generator", response_model=QuestionResponse)
async def generate_question(
    request: QuestionRequest,
    db = Depends(get_db),
    current_user: Any = Depends(get_current_user)
):
    try:
        response = await question_generator_agent(
            schema=request.schema_ddl,
            difficulty=request.difficulty,
            topic=request.topic
        )
        questions_list = response.questions
        
        # Track usage only after complete workflow (schema + populate + questions)
        subscription_service = SubscriptionService(db)
        subscription_service.increment_usage(current_user.id, "generate_schema")
        
        return {"user_id": str(request.user_id), "session_id": str(request.session_id), "questions": questions_list}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"question-generator error: {str(e)} + {str(request)})")


@router.post("/iscorrect", response_model=CheckCorrectResponse)
async def check_correct(
    request: CheckCorrectRequest,
    db=Depends(get_db),
    current_user: Any = Depends(get_current_user)
):
    try:
        conn = get_duckdb_conn(user_id=request.user_id, session_id=request.session_id)
    except Exception:
        raise HTTPException(status_code=404, detail="DuckDB connection not found for the given user/session")
    

    db_session = db.query(DBSession).filter(DBSession.id == request.session_id).first()
    difficulty_multiplier = {
        "basic": 5,
        "intermediate": 10,
        "advanced": 20
    }
    table_head = ""
    points = 0
    is_correct = False
    explanation = ""

    # Attempt to execute the SQL and check correctness
    try:
        result_df = conn.execute(request.sql).fetch_df().head(10)
        table_head = result_df.to_markdown()
        response = await check_correct_agent(
            question=request.question,
            sql=request.sql,
            table_head=table_head
        )
        is_correct = bool(response.is_correct)
        explanation = response.explanation
        points = (1 if is_correct else 0) * difficulty_multiplier.get(request.difficulty.lower(), 0)
    except Exception as e:
        # SQL execution failed, generate explanation
        table_head = ""
        response = await explanation_gen_agent(
            error_generated=str(e)[:300],
            faulty_sql=request.sql
        )
        explanation = response.explanation
        points = 0
        is_correct = False

    # Update session queries and total score if session exists
    if db_session:
        queries = db_session.queries or []
        queries.append({
            "question": request.question,
            "sql": request.sql,
            "is_correct": is_correct,
            "explanation": explanation,
            "table_head": table_head,
            "points": points,
            "difficulty": request.difficulty,
            "checked_at": datetime.utcnow().isoformat()
        })
        db_session.queries = queries
        db_session.total_score = sum(q.get("points", 0) for q in queries if isinstance(q, dict))
        db.commit()

    return CheckCorrectResponse(
        user_id=request.user_id,
        session_id=request.session_id,
        is_correct=is_correct,
        explanation=explanation,
        table_head=table_head,
        points=points,
        difficulty=request.difficulty
    )


    # Insert the result into the session's queries in the DB




    

    
    


@router.post("/execute", response_model=SQLExecuteResponse)
async def execute_sql(
    request: SQLExecuteRequest,
    db=Depends(get_db),
    current_user: Any = Depends(get_current_user)
):
    """
    Validate SQL, execute query, analyze, store in session.
    """
    # --- AUTH DEBUGGING ---
    if not current_user or not getattr(current_user, "id", None):
        return SQLExecuteResponse(success=False, result='', error_message="User not authenticated (execute)")
    # --- END AUTH DEBUGGING ---
    try:
        user_id = current_user.id
        conn = get_duckdb_conn(user_id, request.session_id)
        execution = conn.execute(request.query).fetchdf().head(20)
        result = execution.to_markdown(index=False)
        error_message = None

        db_session = db.query(DBSession).filter(DBSession.id == request.session_id).first()
        if db_session:
            queries = db_session.queries or []
            queries.append({
                "query": request.query,
                "executed_at": datetime.utcnow().isoformat()
            })
            db_session.queries = queries
            db.commit()

        return SQLExecuteResponse(success=True, result=result, error_message=error_message)
    except Exception as e:
        db.rollback()
        return SQLExecuteResponse(success=False, result='', error_message=f"execute error: {str(e)}")


@router.post("/populate-tables", response_model=PopSuccess)
async def populate_tables(
    request: PopulateRequest,
    current_user: Any = Depends(get_current_user)
):
    # --- AUTH DEBUGGING ---
    if not current_user or not getattr(current_user, "id", None):
        raise HTTPException(status_code=401, detail="User not authenticated (populate-tables)")
    # --- END AUTH DEBUGGING ---
    try:
        user_id = current_user.id
        conn = get_duckdb_conn(user_id, request.session_id)
        response = await populate_table_agent(table_schema=request.sql_schema)
        code_retry = False

        code = response.python_code.replace('```', '').replace('python', '')
        try:
            exec(code, {"conn": conn})
        except Exception as e:
            code_retry = True
            response = await code_rewritter_agent(faulty_code = code,schema_ddl= request.sql_schema, error=str(e)[:200])
            code = response.fixed_code.replace('```', '').replace('python', '')
            exec(code, {"conn": conn})


        tables = conn.execute("SHOW TABLES").fetchall()
        counts = {
            row[0]: conn.execute(f"SELECT COUNT(*) FROM {row[0]}").fetchone()[0]
            for row in tables
        }

        num_tables = len(counts)
        num_with_data = sum(1 for count in counts.values() if count > 1)
        if num_tables == 0 or num_with_data / num_tables <= 0.5:
            raise HTTPException(status_code=400, detail=f"Not enough tables have more than 1 row: {counts}")

        return {"message": "Successfully populated tables! with code_retry: "+str(code_retry)}

    except Exception as e:
        raise HTTPException(status_code=400, detail="Code execution failed: " + str(e)+ f"{str(code)} +{str(code_retry)}")
    

@router.post("/delete-duckdb")
async def delete_duckdb(user_id: str, session_id: str, current_user: Any = Depends(get_current_user)):
    """
    Drop all tables in the user's session DuckDB, using CASCADE to force deletion of dependent objects.
    """
    try:
        conn = get_duckdb_conn(user_id=user_id, session_id=session_id)

        # All tables
        tables = [r[0] for r in conn.execute("SHOW TABLES").fetchall()]

        # Drop all tables with CASCADE to force deletion of dependents
        errors = []
        for t in tables:
            try:
                conn.execute(f'DROP TABLE IF EXISTS "{t}" CASCADE')
            except Exception as e:
                errors.append(f"Failed to drop {t}: {str(e)}")

        conn.close()
        if errors:
            raise HTTPException(status_code=500, detail="Some tables could not be dropped: " + "; ".join(errors))
        return {"message": "All tables dropped successfully."}
    except Exception as e:
        try:
            conn.close()
        except:
            pass
        raise HTTPException(status_code=500, detail=f"Failed to drop tables: {str(e)}")
        



@router.get("/sessions", response_model=List[SessionResponse])
async def get_sessions(
    current_user: Any = Depends(get_current_user),
    db=Depends(get_db)
):
    """
    Get user's practice sessions.
    Returns list of sessions with queries and scores.
    """
    # --- AUTH DEBUGGING ---
    if not current_user or not getattr(current_user, "id", None):
        raise HTTPException(status_code=401, detail="User not authenticated (sessions)")
    # --- END AUTH DEBUGGING ---
    try:
        user_id = current_user.id
        sessions = (
            db.query(DBSession)
            .filter(DBSession.user_id == user_id)
            .order_by(DBSession.created_at.desc())
            .all()
        )
        session_responses = []
        for s in sessions:
            session_responses.append(
                SessionResponse(
                    session_id=s.id,
                    schema_id=s.schema_id,
                    queries=s.queries,
                    total_score=s.total_score,
                    created_at=s.created_at,
                    completed_at=s.completed_at
                )
            )
        return session_responses
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"sessions error: {str(e)}")


@router.get("/schemas", response_model=List[SQLSchemaResponse])
async def get_user_schemas(
    current_user: Any = Depends(get_current_user),
    db=Depends(get_db)
):
    """
    Get user's generated schemas.
    Returns list of schemas created by the user.
    """
    # --- AUTH DEBUGGING ---
    if not current_user or not getattr(current_user, "id", None):
        raise HTTPException(status_code=401, detail="User not authenticated (schemas)")
    # --- END AUTH DEBUGGING ---
    try:
        user_id = current_user.id
        schemas = (
            db.query(DBSchema)
            .filter(DBSchema.user_id == user_id)
            .order_by(DBSchema.created_at.desc())
            .all()
        )
        schema_responses = []
        for s in schemas:
            schema_responses.append(
                SQLSchemaResponse(
                    user_id=s.user_id,
                    session_id=s.schema_id,
                    created_at=s.created_at,
                    schema_script=s.schema_script,
                    schema_created=True
                )
            )
        return schema_responses
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"schemas error: {str(e)}") 