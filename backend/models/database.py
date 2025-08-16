"""
Database models for SQL Tutor AI backend using SQLAlchemy ORM.
"""

from sqlalchemy import Column, String, Integer, DateTime, Boolean, Text, ForeignKey, JSON
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
    created_at = Column(DateTime, default=func.now())
    last_login_at = Column(DateTime, default=func.now(), onupdate=func.now())
    subscription_plan_id = Column(String(255), ForeignKey("subscription_plans.id"))
    
    # Relationship to SubscriptionPlan (one-to-many)
    subscription_plan = relationship("SubscriptionPlan", back_populates="users")
    # Relationship to UserUsage (one-to-many)
    usage_records = relationship("UserUsage", back_populates="user")
    # Relationship to Schema (one-to-many)
    schemas = relationship("Schema", back_populates="user")
    # Relationship to Session (one-to-many)
    sessions = relationship("Session", back_populates="user")
    # Relationship to CompetitionSubmission (one-to-many)
    competition_submissions = relationship("CompetitionSubmission", back_populates="user")
    # Relationship to Subscription (one-to-many)
    subscriptions = relationship("Subscription", back_populates="user")

class Schema(Base):
    """Database schema model for storing generated schemas."""
    __tablename__ = "schemas"
    
    schema_id = Column(String(255), primary_key=True, default=generate_uuid)
    user_id = Column(String(255), ForeignKey("users.id"), nullable=False)
    schema_script = Column(Text, nullable=False)  # Store the full schema script as long text
    created_at = Column(DateTime, default=func.now())
    
    # Relationships
    user = relationship("User", back_populates="schemas")
    sessions = relationship("Session", back_populates="schema")
    competitions = relationship("Competition", back_populates="schema")

class Session(Base):
    """Practice session model for storing user practice sessions."""
    __tablename__ = "sessions"
    
    id = Column(String(255), primary_key=True, default=generate_uuid)
    user_id = Column(String(255), ForeignKey("users.id"), nullable=False)
    schema_id = Column(String(255), ForeignKey("schemas.schema_id"), nullable=False)
    queries = Column(JSON, nullable=False)  # Store queries and results as JSON
    difficulty = Column(String(255))
    total_score = Column(Integer, default=0)
    created_at = Column(DateTime, default=func.now())
    completed_at = Column(DateTime)

    # Relationships
    user = relationship("User", back_populates="sessions")
    schema = relationship("Schema", back_populates="sessions")

class CompetitionSubmission(Base):
    """Competition submission model for user vs AI competitions."""
    __tablename__ = "competition_submissions"
    
    id = Column(String(255), primary_key=True, default=generate_uuid)
    competition_id = Column(String(255), nullable=False)  # Remove FK constraint for now
    user_id = Column(String(255), ForeignKey("users.id"), nullable=False)
    
    # Competition details
    difficulty = Column(String(50), nullable=False)  # basic, intermediate, advanced
    total_rounds = Column(Integer, default=5)
    
    # User performance
    user_queries = Column(JSON)  # List of user's SQL queries
    user_score = Column(Integer, default=0)  # Total points earned
    user_correct_answers = Column(Integer, default=0)
    
    # AI performance
    ai_queries = Column(JSON)  # List of AI's SQL queries  
    ai_score = Column(Integer, default=0)  # Total AI points
    ai_correct_answers = Column(Integer, default=0)
    
    # Result
    result = Column(String(10))  # 'win', 'lose', 'tie'
    total_time_taken = Column(Integer, default=0)  # Total seconds
    
    # Metadata
    submitted_at = Column(DateTime, default=func.now())
    rounds_data = Column(JSON)  # Detailed round-by-round data
    
    # Relationships
    user = relationship("User", back_populates="competition_submissions")

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
