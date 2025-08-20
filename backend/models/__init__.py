# Models package for SQL Trainer AI backend
from .database import *
from .schemas import * 

import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv
from sqlalchemy.pool import NullPool
from sqlalchemy import inspect

# Load environment variables from .env file
load_dotenv()

DB = os.getenv("DATABASE")



# Only create tables automatically for local SQLite, not for production Postgres

# This creates a SQLAlchemy session factory called SessionLocal.
# Each instance of SessionLocal() provides a database session for interacting with the database.
 
if DB=="SUPABASE":
    USER = os.getenv("dbuser")
    PASSWORD = os.getenv("dbpassword")
    HOST = os.getenv("dbhost")
    PORT = os.getenv("dbport")
    DBNAME = os.getenv("dbname")

# Construct the SQLAlchemy connection string
    DB_URL = f"postgresql+psycopg2://{USER}:{PASSWORD}@{HOST}:{PORT}/{DBNAME}?sslmode=require"
    # For Postgres, check if tables exist before creating (no-op if already present)

    engine = create_engine(DB_URL, echo=True, poolclass=NullPool)
else:
    DB_URL = os.getenv("DATABASE_URL")
    engine = create_engine(DB_URL, echo=False, future=True)
# This creates a SQLAlchemy session factory called SessionLocal.
# Each instance of SessionLocal() provides a database session for interacting with the database.
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
inspector = inspect(engine)
tables = inspector.get_table_names()
Base.metadata.create_all(engine)
