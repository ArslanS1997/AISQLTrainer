"""
Pydantic schemas for request/response validation in SQL Tutor AI backend.
"""

from pydantic import BaseModel, EmailStr
from typing import List, Optional, Dict, Any
from datetime import datetime

# ============================================================================
# AUTHENTICATION SCHEMAS
# ============================================================================

class GoogleAuthRequest(BaseModel):
    id_token: str
    access_token: str

class UserResponse(BaseModel):
    user: Dict[str, Any]
    access_token: Optional[str] = None
    token_type: str = "bearer"

    class Config:
        from_attributes = True

# ============================================================================
# SQL PRACTICE SCHEMAS
# ============================================================================

# class Agents(BaseModel):
#     generate_schema = 

class SessionCreationRequest(BaseModel):
    user_id: str
    session_id: str
    schema_script: str
    difficulty: str

class PopSuccess(BaseModel):
    message:str


class SQLSchemaRequest(BaseModel):
    user_id: str
    session_id: str
    prompt: str
    difficulty: str = "basic"  

class SQLSchemaResponse(BaseModel):
    user_id: str
    session_id: str
    created_at: datetime
    schema_script: str
    schema_created: bool

    # This inner Config class tells Pydantic to allow model creation from ORM objects (like SQLAlchemy models)
    # by using attribute access instead of dict keys. This is useful for response models that map to DB models.
    class Config:
        from_attributes = True

class ExplanationRequest(BaseModel):
    user_id:str
    session_id:str
    error_generated: str
    faulty_sql:str
class SQLExecuteRequest(BaseModel):
    query: str
    user_id: str
    session_id:str

class SQLExecuteResponse(BaseModel):
    success: bool
    result: str
    error_message: Optional[str] = None

class PopulateRequest(BaseModel):
    user_id: str
    session_id: str
    sql_schema: str

class CheckCorrectRequest(BaseModel):
    user_id: str
    session_id: str 
    difficulty: str
    question: str
    sql: str

class CheckCorrectResponse(BaseModel):
    user_id: str
    session_id: str
    is_correct: bool
    explanation: str
    table_head: str
    points: int
    difficulty: str

class QuestionRequest(BaseModel):
    user_id: str
    session_id: str
    schema_ddl: str
    topic: str
    difficulty: str

class QuestionResponse(BaseModel):
    user_id: str
    session_id: str
    questions:List[str]

class CreateSessionRequest(BaseModel):
    user_id: str
    session_id: str
    schema_script: str
    difficulty: str

class CreateSessionResponse(BaseModel):
    session_id: str
    user_id: str
    schema_id: str
    schema_script: str
    difficulty: str
    created_at: datetime
    status: str


class SessionResponse(BaseModel):
    session_id: str
    schema_id: str
    queries: List[Dict[str, Any]]
    total_score: int
    created_at: datetime
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ============================================================================
# COMPETITION SCHEMAS
# ============================================================================

class Competition(BaseModel):
    competition_id: str
    schema_id: Optional[str] = None
    difficulty: Optional[str] = None
    time_limit: Optional[int] = None
    started_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class CompetitionStartRequest(BaseModel):
    difficulty: str = "beginner"
    time_limit: int = 300  # seconds

class CompetitionStartResponse(Competition):
    time_limit: int
    started_at: datetime
    expires_at: datetime

class CompetitionSubmitRequest(BaseModel):
    competition_id: str
    query: str

class CompetitionSubmitResponse(BaseModel):
    success: bool
    score: int
    time_taken: int  # seconds
    rank: Optional[int] = None
    feedback: str

class CompetitionHistoryResponse(Competition):
    score: int
    rank: int
    time_taken: int
    completed_at: datetime
    difficulty: str

# ============================================================================
# DASHBOARD SCHEMAS
# ============================================================================

class DashboardStatsResponse(BaseModel):
    total_practice_sessions: int
    total_competitions: int
    average_score: float
    total_points: int
    current_streak: int
    best_rank: Optional[int] = None

class ProgressResponse(BaseModel):
    beginner_completed: int
    intermediate_completed: int
    advanced_completed: int
    total_queries: int
    accuracy_rate: float
    learning_path: List[Dict[str, Any]]

# ============================================================================
# BILLING SCHEMAS
# ============================================================================

class CheckoutRequest(BaseModel):
    plan: str
    billing_cycle: str 


class CheckoutResponse(BaseModel):
    checkout_url: str

class SubscriptionResponse(BaseModel):
    subscription_id: str
    status: str  # active, canceled, past_due
    plan: str
    current_period_end: datetime
    cancel_at_period_end: bool

    class Config:
        from_attributes = True

# ============================================================================
# COMMON SCHEMAS
# ============================================================================

class ErrorResponse(BaseModel):
    error: str
    message: str
    status_code: int

class SuccessResponse(BaseModel):
    message: str
    status_code: int = 200

class PaginationParams(BaseModel):
    page: int = 1
    size: int = 10
    sort_by: Optional[str] = None
    sort_order: Optional[str] = "desc"  # asc, desc 