"""
Database models for SQL Trainer AI backend using SQLAlchemy ORM.
"""

from sqlalchemy import Column, String, Integer, DateTime, Boolean, Text, ForeignKey, JSON, UniqueConstraint, CheckConstraint, Index
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from datetime import datetime
import uuid

Base = declarative_base()

def generate_uuid():
    """Generate a UUID for primary keys."""
    return str(uuid.uuid4())

class User(Base):
    """User model for authentication and profile information."""
    __tablename__ = "users"
    
    id = Column(String(255), primary_key=True, default=generate_uuid)
    email = Column(String(255), unique=True, nullable=False)
    name = Column(String(255), nullable=False)
    points = Column(Integer, default=0)
    stripe_customer_id = Column(String(255), unique=True, nullable=True)
    created_at = Column(DateTime, default=func.now())
    last_login_at = Column(DateTime, default=func.now(), onupdate=func.now())
    subscription_plan_id = Column(String(255), ForeignKey("subscription_plans.id"))
    
    # Relationships
    subscription_plan = relationship("SubscriptionPlan", back_populates="users")
    usage_records = relationship("UserUsage", back_populates="user")
    sessions = relationship("Session", back_populates="user")
    competition_submissions = relationship("Competition", back_populates="user")
    subscriptions = relationship("Subscription", back_populates="user")
    
    # Indexes for frequent lookups
    __table_args__ = (
        Index('idx_user_email', 'email'),  # Fast login lookups
        Index('idx_user_stripe_customer', 'stripe_customer_id'),  # Stripe operations
        Index('idx_user_subscription_plan', 'subscription_plan_id'),  # Plan queries
        Index('idx_user_created_at', 'created_at'),  # User analytics
        Index('idx_user_points', 'points'),  # Leaderboards
    )

class Session(Base):
    """Practice session model for storing user practice sessions."""
    __tablename__ = "sessions"
    
    id = Column(String(255), primary_key=True, default=generate_uuid)
    user_id = Column(String(255), ForeignKey("users.id"), nullable=False)
    
    # Remove the old queries JSON field
    # queries = Column(JSON, nullable=False)
    
    difficulty = Column(String(255))
    total_score = Column(Integer, default=0)
    created_at = Column(DateTime, default=func.now())
    completed_at = Column(DateTime)

    # Relationships
    user = relationship("User", back_populates="sessions")
    questions = relationship("SessionQuestion", back_populates="session", order_by="SessionQuestion.question_number")
    
    # Indexes for session queries
    __table_args__ = (
        Index('idx_session_user_id', 'user_id'),  # User's sessions
        Index('idx_session_difficulty', 'difficulty'),  # Filter by difficulty
        Index('idx_session_created_at', 'created_at'),  # Session analytics
        Index('idx_session_completed_at', 'completed_at'),  # Completed sessions
        Index('idx_session_user_difficulty', 'user_id', 'difficulty'),
    )

class Competition(Base):
    """Competition model for user vs AI competitions."""
    __tablename__ = "competitions"

    id = Column(String(255), primary_key=True, default=generate_uuid)
    user_id = Column(String(255), ForeignKey("users.id"), nullable=False)

    # Competition details
    difficulty = Column(String(50), nullable=False)  # 'basic', 'intermediate', 'advanced'
    schema_ddl = Column(Text, nullable=False)  # The schema DDL for this competition
    questions = Column(JSON, nullable=False)  # List of 5 pre-generated questions
    total_rounds = Column(Integer, default=5)
    current_round = Column(Integer, default=1)

    # Timing
    time_limit = Column(Integer, default=180)  # User gets 3 minutes total
    ai_time_limit = Column(Integer, default=30)  # AI gets 30 seconds per question
    started_at = Column(DateTime, default=func.now())
    expires_at = Column(DateTime, nullable=False)
    completed_at = Column(DateTime)

    # User performance
    user_queries = Column(JSON, default=list)  # List of user's SQL queries
    user_score = Column(Integer, default=0)
    user_correct_answers = Column(Integer, default=0)

    # AI performance
    ai_queries = Column(JSON, default=list)  # List of AI's SQL queries
    ai_score = Column(Integer, default=0)
    ai_correct_answers = Column(Integer, default=0)

    # Result and status
    result = Column(String(10))  # 'win', 'lose', 'tie'
    total_time_taken = Column(Integer, default=0)
    status = Column(String(20), default='active')  # 'active', 'completed', 'expired'

    # Metadata
    submitted_at = Column(DateTime, default=func.now())
    rounds_data = Column(JSON, default=list)  # List of dicts, one per round

    # Relationships
    user = relationship("User", back_populates="competition_submissions")
    rounds = relationship("CompetitionRound", back_populates="competition", cascade="all, delete-orphan")
    
    # Critical indexes for competition queries
    __table_args__ = (
        Index('idx_competition_user_id', 'user_id'),  # User's competitions
        Index('idx_competition_status', 'status'),  # Active/completed competitions
        Index('idx_competition_difficulty', 'difficulty'),  # Filter by difficulty
        Index('idx_competition_expires_at', 'expires_at'),  # Expired competitions cleanup
        Index('idx_competition_started_at', 'started_at'),  # Competition analytics
        Index('idx_competition_user_score', 'user_score'),  # Leaderboards
        Index('idx_competition_completed_at', 'completed_at'),  # Completed competitions
        # Composite indexes for common query patterns
        Index('idx_competition_user_status', 'user_id', 'status'),
        Index('idx_competition_user_difficulty', 'user_id', 'difficulty'),
        Index('idx_competition_status_expires', 'status', 'expires_at'),
    )

class CompetitionRound(Base):
    """Round-level model for each round in a competition."""
    __tablename__ = "competition_rounds"

    competition_id = Column(String(255), ForeignKey("competitions.id"), primary_key=True)
    round_number = Column(Integer, primary_key=True)  # 1, 2, 3, ...

    # Question and SQLs
    question = Column(Text, nullable=False)
    difficulty = Column(String(50), nullable=False)  # 'basic', 'intermediate', 'advanced'
    user_sql = Column(Text)
    ai_sql = Column(Text)

    # Results
    user_correct = Column(Boolean, default=False)
    ai_correct = Column(Boolean, default=False)
    user_points = Column(Integer, default=0)
    ai_points = Column(Integer, default=0)
    correct_answer = Column(Text)
    explanation = Column(Text)

    # Timing
    user_response_time = Column(Integer)  # in seconds
    ai_response_time = Column(Integer)    # in seconds

    # Metadata
    created_at = Column(DateTime, default=func.now())

    # Relationships
    competition = relationship("Competition", back_populates="rounds")
    
    # Indexes for round queries
    __table_args__ = (
        Index('idx_round_competition_round', 'competition_id', 'round_number'),
        Index('idx_round_difficulty', 'difficulty'),
        Index('idx_round_created_at', 'created_at'),
    )



class SubscriptionPlan(Base):
    """Subscription plan model for defining available plans."""
    __tablename__ = "subscription_plans"
    
    id = Column(String(255), primary_key=True, default=generate_uuid)
    name = Column(String(100), nullable=False)  # 'free', 'pro', 'max'
    display_name = Column(String(100), nullable=False)  # 'Free Plan', 'Pro Plan', 'Max Plan'
    price_monthly = Column(Integer, default=0)  # in cents
    price_yearly = Column(Integer, default=0)  # in cents
    stripe_price_id_monthly = Column(String(255))
    stripe_price_id_yearly = Column(String(255))
    
    # Feature limits
    max_schemas_per_month = Column(Integer, default=5)
    max_competitions_per_month = Column(Integer, default=3)
    can_download_certificates = Column(Boolean, default=False)
    can_get_master_certificate = Column(Boolean, default=False)
    ai_model_tier = Column(String(50), default='gpt-4o-mini')  # 'gpt-4o-mini', 'gpt-4o', 'gpt-4'
    
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # This matches the back_populates in User
    users = relationship("User", back_populates="subscription_plan")

class UserUsage(Base):
    """Track user monthly usage for plan limits."""
    __tablename__ = "user_usage"
    
    id = Column(String(255), primary_key=True, default=generate_uuid)
    user_id = Column(String(255), ForeignKey("users.id"), nullable=False)
    year = Column(Integer, nullable=False)
    month = Column(Integer, nullable=False)  # 1-12
    schemas_generated = Column(Integer, default=0)
    competitions_entered = Column(Integer, default=0)
    
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationship to User (many-to-one)
    user = relationship("User", back_populates="usage_records")
    
    # Indexes for usage tracking
    __table_args__ = (
        Index('idx_usage_user_id', 'user_id'),  # User's usage
        Index('idx_usage_year_month', 'year', 'month'),  # Monthly usage
        Index('idx_usage_user_year_month', 'user_id', 'year', 'month'),  # User's monthly usage
        Index('idx_usage_created_at', 'created_at'),  # Usage analytics
    )

class Subscription(Base):
    """Subscription model for storing user subscriptions."""
    __tablename__ = "subscriptions"
    
    id = Column(String(255), primary_key=True, default=generate_uuid)
    user_id = Column(String(255), ForeignKey("users.id"))
    stripe_subscription_id = Column(String(255), unique=True)
    plan = Column(String(50), nullable=False)  # 'free', 'pro', 'max'
    status = Column(String(50), nullable=False)  # 'active', 'canceled', 'past_due'
    current_period_end = Column(DateTime, nullable=False)
    cancel_at_period_end = Column(Boolean, default=False)
    selected_model_index = Column(Integer, default=0)  # Add this line
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    user = relationship("User", back_populates="subscriptions")
    
    # Indexes for subscription queries
    __table_args__ = (
        Index('idx_subscription_user_id', 'user_id'),  # User's subscriptions
        Index('idx_subscription_status', 'status'),  # Active subscriptions
        Index('idx_subscription_plan', 'plan'),  # Filter by plan
        Index('idx_subscription_period_end', 'current_period_end'),  # Expiring subscriptions
        Index('idx_subscription_stripe_id', 'stripe_subscription_id'),  # Stripe operations
        Index('idx_subscription_user_status', 'user_id', 'status'),
        Index('idx_subscription_status_period', 'status', 'current_period_end'),
    )



class SessionQuestion(Base):
    """Individual questions within a practice session."""
    __tablename__ = "session_questions"
    
    id = Column(String(255), primary_key=True, default=generate_uuid)
    session_id = Column(String(255), ForeignKey("sessions.id", ondelete="CASCADE"), nullable=False)
    question_number = Column(Integer, nullable=False)  # 1, 2, 3, etc.
    
    # Question content
    question_text = Column(Text, nullable=False)
    difficulty = Column(String(50), nullable=False)  # basic, intermediate, advanced
    topic = Column(String(100), nullable=False)
    
    # User's answer (filled when answered)
    user_sql = Column(Text, nullable=True)
    is_correct = Column(Boolean, nullable=True)
    points_earned = Column(Integer, default=0)
    explanation = Column(Text, nullable=True)
    expected_sql = Column(Text, nullable=True)
    table_head = Column(Text, nullable=True)
    answered_at = Column(DateTime, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationship
    session = relationship("Session", back_populates="questions")
    
    # Composite unique constraint (only when session_id is not null)
    __table_args__ = (
        CheckConstraint('session_id IS NOT NULL OR question_number IS NOT NULL', name='valid_question'),
        Index('idx_question_session_id', 'session_id'),  # Questions in session
        Index('idx_question_difficulty', 'difficulty'),  # Filter by difficulty
        Index('idx_question_topic', 'topic'),  # Filter by topic
        Index('idx_question_is_correct', 'is_correct'),  # Performance analytics
        Index('idx_question_answered_at', 'answered_at'),  # Response time analytics
        Index('idx_question_session_difficulty', 'session_id', 'difficulty'),
    )

class SQLChatbotQuery(Base):
    """Simple table for SQL chatbot queries and responses."""
    __tablename__ = "sql_chatbot_queries"
    
    id = Column(String(255), primary_key=True, default=generate_uuid)
    user_id = Column(String(255), nullable=False)  # Just store the ID, no foreign key
    query = Column(Text, nullable=False)  # User's question
    ai_response = Column(Text, nullable=False)  # AI's response
    created_at = Column(DateTime, default=func.now())
    
    # Indexes
    __table_args__ = (
        Index('idx_chatbot_query_user_id', 'user_id'),
        Index('idx_chatbot_query_created_at', 'created_at'),
    )
