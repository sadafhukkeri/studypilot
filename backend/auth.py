"""Auth helpers — JWT email/password + Emergent Google OAuth session tokens."""
import os
import bcrypt
import jwt as pyjwt
from datetime import datetime, timezone, timedelta
from fastapi import Request, HTTPException, Depends
from typing import Optional
import httpx

JWT_SECRET = os.environ.get("JWT_SECRET", "dev-secret")
JWT_ALG = "HS256"
JWT_DAYS = 30

EMERGENT_AUTH_URL = "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data"


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def create_jwt(user_id: str) -> str:
    payload = {
        "user_id": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(days=JWT_DAYS),
        "iat": datetime.now(timezone.utc),
    }
    return pyjwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)


def decode_jwt(token: str) -> Optional[dict]:
    try:
        return pyjwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
    except Exception:
        return None


async def fetch_emergent_session(session_id: str) -> dict:
    async with httpx.AsyncClient(timeout=20.0) as client:
        resp = await client.get(
            EMERGENT_AUTH_URL,
            headers={"X-Session-ID": session_id},
        )
        if resp.status_code != 200:
            raise HTTPException(status_code=401, detail="Invalid session_id")
        return resp.json()


async def get_current_user(request: Request, db=None):
    """Resolve user from cookie session_token or Authorization header (JWT)."""
    from server import db as _db
    db = db if db is not None else _db

    # Cookie path: Emergent OAuth session_token
    session_token = request.cookies.get("session_token")
    if session_token:
        sess = await db.user_sessions.find_one(
            {"session_token": session_token}, {"_id": 0}
        )
        if sess:
            expires_at = sess.get("expires_at")
            if isinstance(expires_at, str):
                expires_at = datetime.fromisoformat(expires_at)
            if expires_at and expires_at.tzinfo is None:
                expires_at = expires_at.replace(tzinfo=timezone.utc)
            if expires_at and expires_at > datetime.now(timezone.utc):
                user = await db.users.find_one(
                    {"user_id": sess["user_id"]}, {"_id": 0}
                )
                if user:
                    return user

    # Bearer JWT path: email/password login
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        token = auth_header.split(" ", 1)[1]
        # Try JWT
        payload = decode_jwt(token)
        if payload and "user_id" in payload:
            user = await db.users.find_one(
                {"user_id": payload["user_id"]}, {"_id": 0}
            )
            if user:
                return user
        # Else try as session_token
        sess = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
        if sess:
            user = await db.users.find_one(
                {"user_id": sess["user_id"]}, {"_id": 0}
            )
            if user:
                return user

    raise HTTPException(status_code=401, detail="Not authenticated")
