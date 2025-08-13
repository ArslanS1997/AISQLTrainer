"""
Authentication routes for SQL Tutor AI backend.
Handles Google OAuth and user session management.
"""

from fastapi import APIRouter, HTTPException, Depends, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Dict, Any, Optional
import os

from models.schemas import GoogleAuthRequest, UserResponse, SuccessResponse
from utils.auth import verify_google_token, create_access_token, get_user_from_token

from models import User
from models import SessionLocal
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
from datetime import datetime
import requests

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

# NOTE: Set auto_error=False so endpoints can be accessed without credentials (for debugging)
security = HTTPBearer(auto_error=False)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db)
):
    """
    Dependency to get current authenticated user.
    Accepts either:
      - App JWT issued by this backend (preferred)
      - Google access token (fallback): will be validated via Google UserInfo
    """
    if not credentials or not credentials.credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing authentication credentials")
    token = credentials.credentials
    # 1) Try our own JWT first
    try:
        payload = get_user_from_token(token)
        user_id = payload.get("id")
        if not user_id:
            raise ValueError("Missing id in JWT payload")
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
        return user
    except Exception:
        # 2) Fallback: treat token as Google access token
        try:
            resp = requests.get(
                "https://www.googleapis.com/oauth2/v2/userinfo",
                headers={"Authorization": f"Bearer {token}"},
                timeout=5
            )
            if resp.status_code != 200:
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
            info = resp.json()
            google_id = info.get("id") or info.get("sub")
            if not google_id:
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Google token")
            # Find or create user
            user = db.query(User).filter(User.id == google_id).first()
            now = datetime.utcnow()
            if user:
                user.email = info.get("email", user.email)
                user.name = info.get("name", user.name)
                user.last_login_at = now
            else:
                user = User(
                    id=google_id,
                    email=info.get("email"),
                    name=info.get("name"),
                    created_at=now,
                    last_login_at=now
                )
                db.add(user)
            db.commit()
            db.refresh(user)
            return user
        except HTTPException:
            raise
        except Exception:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")

@router.post("/google", response_model=UserResponse)
async def google_auth(request: GoogleAuthRequest, db: Session = Depends(get_db)):
    """
    Authenticate user with Google OAuth.
    - id_token: Google ID token (or access token if ID token not available)
    - access_token: Google access token
    Returns user object, creates/updates user, updates last_login_at.
    """
    google_user = None
    
    # First try to verify Google ID token
    try:
        google_user = verify_google_token(request.id_token)
    except HTTPException:
        # If ID token verification fails, try using access token to get user info
        try:
            resp = requests.get(
                "https://www.googleapis.com/oauth2/v2/userinfo",
                headers={"Authorization": f"Bearer {request.access_token}"},
                timeout=5
            )
            if resp.status_code == 200:
                info = resp.json()
                google_user = {
                    "id": info.get("id"),
                    "email": info.get("email"),
                    "name": info.get("name"),
                    "picture": info.get("picture")
                }
            else:
                raise HTTPException(status_code=400, detail="Invalid Google access token")
        except Exception as e:
            raise HTTPException(status_code=400, detail="Failed to verify Google credentials")
    
    if not google_user or not google_user.get("id"):
        raise HTTPException(status_code=400, detail="Invalid Google token")

    user = db.query(User).filter(User.id == google_user["id"]).first()
    now = datetime.utcnow()
    if user:
        # Update user info and last_login_at
        user.email = google_user.get("email", user.email)
        user.name = google_user.get("name", user.name)
        user.last_login_at = now
    else:
        # Create new user
        user = User(
            id=google_user["id"],
            email=google_user.get("email"),
            name=google_user.get("name"),
            created_at=now,
            last_login_at=now
        )
        db.add(user)
    try:
        db.commit()
        db.refresh(user)
    except SQLAlchemyError as e:
        db.rollback()
        raise HTTPException(status_code=500, detail="Database error")

    # Create JWT access token
    access_token = create_access_token({"id": user.id, "email": user.email})
    user_dict = {
        "id": user.id,
        "email": user.email,
        "name": user.name,
        "picture": google_user.get("picture"),
        "points": user.points if hasattr(user, 'points') else 0,
        "membership": user.membership if hasattr(user, 'membership') else 'free',
        "created_at": user.created_at.isoformat() if user.created_at else None,
        "last_login_at": user.last_login_at.isoformat() if user.last_login_at else None
    }
    return {
        "user": user_dict,
        "access_token": access_token,
        "token_type": "bearer"
    }

@router.post("/logout", response_model=SuccessResponse)
async def logout(current_user: User = Depends(get_current_user)):
    """
    Logout current user. Invalidate JWT/session and delete user's DuckDB file.
    """

    # Path to the user's DuckDB file (adjust path as needed)
    duckdb_dir = os.getenv("USER_DUCKDB_DIR", "user_dbs")
    duckdb_file = os.path.join(duckdb_dir, f"{current_user.id}.duckdb")

    # Attempt to delete the DuckDB file if it exists
    try:
        if os.path.exists(duckdb_file):
            os.remove(duckdb_file)
    except Exception as e:
        # Log error but do not fail logout
        import logging
        logging.error(f"Failed to delete DuckDB file for user {current_user.id}: {e}")

    return {"success": True, "message": "Logged out successfully and user database deleted."}

@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db)
):
    """
    Get current user information.
    """
    # Try to get user, but if not authenticated, return 401
    try:
        user = await get_current_user(credentials, db)
    except HTTPException as e:
        raise e

    user_dict = {
        "id": user.id,
        "email": user.email,
        "name": user.name,
        "picture": None,  # Could be stored in DB or fetched from Google
        "points": user.points if hasattr(user, 'points') else 0,
        "membership": user.membership if hasattr(user, 'membership') else 'free',
        "created_at": user.created_at.isoformat() if user.created_at else None,
        "last_login_at": user.last_login_at.isoformat() if user.last_login_at else None
    }
    return {
        "user": user_dict,
        "access_token": None,
        "token_type": "bearer"
    }