# Models package for SQL Tutor AI backend
from .database import *
from .schemas import * 

import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

DB_URL = os.getenv("DATABASE_URL")

if DB_URL is None:
    raise RuntimeError("DB_URL not set in .env file")

engine = create_engine(DB_URL, echo=False, future=True)
# This creates a SQLAlchemy session factory called SessionLocal.
# Each instance of SessionLocal() provides a database session for interacting with the database.
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base.metadata.create_all(engine)