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
    membership = Column(String(50), default='free')
    created_at = Column(DateTime, default=func.now())
    last_login_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    schemas = relationship("Schema", back_populates="user")
    sessions = relationship("Session", back_populates="user")
    competition_submissions = relationship("CompetitionSubmission", back_populates="user")
    subscriptions = relationship("Subscription", back_populates="user")

class Schema(Base):
    """Database schema model for storing generated schemas."""
    __tablename__ = "schemas"
    
    schema_id = Column(String(255), primary_key=True, default=generate_uuid)
    user_id = Column(String(255), ForeignKey("users.id"))
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
    user_id = Column(String(255), ForeignKey("users.id"))
    schema_id = Column(String(255), ForeignKey("schemas.schema_id"))
    queries = Column(JSON, nullable=False)  # Store queries and results as JSON
    total_score = Column(Integer, default=0)
    created_at = Column(DateTime, default=func.now())
    completed_at = Column(DateTime)

    # Relationships
    user = relationship("User", back_populates="sessions")
    schema = relationship("Schema", back_populates="sessions")

class Competition(Base):
    """Competition model for SQL competitions."""
    __tablename__ = "competitions"
    
    id = Column(String(255), primary_key=True, default=generate_uuid)
    schema_id = Column(String(255), ForeignKey("schemas.schema_id"))
    difficulty = Column(String(50), default='basic')
    time_limit = Column(Integer, default=300)  # seconds
    started_at = Column(DateTime, default=func.now())
    expires_at = Column(DateTime, nullable=False)
    status = Column(String(50), default='active')
    
    # Relationships
    schema = relationship("Schema", back_populates="competitions")
    submissions = relationship("CompetitionSubmission", back_populates="competition")

class CompetitionSubmission(Base):
    """Competition submission model for storing user submissions."""
    __tablename__ = "competition_submissions"
    
    id = Column(String(255), primary_key=True, default=generate_uuid)
    competition_id = Column(String(255), ForeignKey("competitions.id"))
    user_id = Column(String(255), ForeignKey("users.id"))
    query = Column(Text, nullable=False)
    score = Column(Integer, default=0)
    time_taken = Column(Integer, default=0)  # seconds
    submitted_at = Column(DateTime, default=func.now())
    rank = Column(Integer)
    
    # Relationships
    competition = relationship("Competition", back_populates="submissions")
    user = relationship("User", back_populates="competition_submissions")

class Subscription(Base):
    """Subscription model for Stripe billing."""
    __tablename__ = "subscriptions"
    
    id = Column(String(255), primary_key=True, default=generate_uuid)
    user_id = Column(String(255), ForeignKey("users.id"))
    stripe_subscription_id = Column(String(255), unique=True, nullable=False)
    status = Column(String(50), nullable=False)
    plan = Column(String(100), nullable=False)
    current_period_end = Column(DateTime, nullable=False)
    cancel_at_period_end = Column(Boolean, default=False)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    user = relationship("User", back_populates="subscriptions") 
