"""
Simple FastAPI backend for the Fitness Habit Tracker with Gamification.

This file is intentionally simple and uses SQLite in the same folder
to keep the example beginner-friendly. It implements:
- Registration and login (JWT)
- Endpoints for completing daily goals, streak & XP management
- Leaderboard and a simple "AI" weekly summary (mocked)
- Achievement engine and RPG-style level system: level up every 100 XP

Comments are included for beginners.
"""
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from passlib.context import CryptContext
from pydantic import BaseModel
import sqlite3
import datetime
import jwt
from typing import Optional, List

# Secret for JWT (in production keep this safe!)
SECRET_KEY = "dev-secret-key"
ALGORITHM = "HS256"

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/login")

app = FastAPI(title="Fitness Habit Tracker API")

# Allow requests from the frontend dev server (Vite)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Simple SQLite DB in the backend folder
DB_PATH = "./data.db"


def get_db():
    # return a sqlite3 connection (we reuse one per process)
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_db()
    c = conn.cursor()
    # Users table stores basic auth + progress
    c.execute(
        """
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY,
            username TEXT UNIQUE,
            password_hash TEXT,
                xp INTEGER DEFAULT 0,
            streak INTEGER DEFAULT 0,
            level INTEGER DEFAULT 1,
            last_completed_date TEXT DEFAULT NULL,
                achievements TEXT DEFAULT '',
                daily_goal TEXT DEFAULT ''
        )
        """
    )
    conn.commit()
    # Ensure `daily_goal` column exists for older DBs
    try:
        c.execute("ALTER TABLE users ADD COLUMN daily_goal TEXT DEFAULT ''")
        conn.commit()
    except Exception:
        # column probably already exists
        pass


init_db()


class UserCreate(BaseModel):
    username: str
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str


def verify_password(plain_password, hashed):
    try:
        return pwd_context.verify(plain_password, hashed)
    except Exception:
        # Fallback for environments where bcrypt backend is unavailable:
        import hashlib
        return hashlib.sha256(plain_password.encode()).hexdigest() == hashed


def get_password_hash(password):
    try:
        return pwd_context.hash(password)
    except Exception:
        # Fallback: use SHA-256 (not recommended for production)
        import hashlib
        return hashlib.sha256(password.encode()).hexdigest()


def create_access_token(data: dict, expires_delta: Optional[int] = None):
    # For simplicity no expiration is implemented here (beginner friendly)
    return jwt.encode(data, SECRET_KEY, algorithm=ALGORITHM)


def get_user(username: str):
    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT * FROM users WHERE username = ?", (username,))
    row = c.fetchone()
    return row


def create_user(username: str, password: str):
    conn = get_db()
    c = conn.cursor()
    pw_hash = get_password_hash(password)
    try:
        c.execute(
            "INSERT INTO users (username, password_hash) VALUES (?, ?)",
            (username, pw_hash),
        )
        conn.commit()
    except sqlite3.IntegrityError:
        return None
    return get_user(username)


def authenticate_user(username: str, password: str):
    user = get_user(username)
    if not user:
        return False
    if not verify_password(password, user["password_hash"]):
        return False
    return user


async def get_current_user(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise HTTPException(status_code=401, detail="Invalid auth token")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid auth token")
    user = get_user(username)
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    # convert sqlite Row to plain dict for easier use in endpoints
    return dict(user)


def calculate_level(xp: int) -> int:
    # Level up every 100 XP
    return xp // 100 + 1


def maybe_add_achievement(user_row, new_xp):
    # Simple achievement engine that awards badges at milestones
    achievements = set(filter(None, (user_row["achievements"] or "").split(",")))
    awarded = []
    if new_xp >= 100 and "First 100 XP" not in achievements:
        achievements.add("First 100 XP")
        awarded.append("First 100 XP")
    if new_xp >= 500 and "500 XP Champion" not in achievements:
        achievements.add("500 XP Champion")
        awarded.append("500 XP Champion")
    if new_xp >= 1000 and "Legend (1000 XP)" not in achievements:
        achievements.add("Legend (1000 XP)")
        awarded.append("Legend (1000 XP)")
    return list(achievements), awarded


@app.post("/register", response_model=Token)
def register(payload: UserCreate):
    """Create a new user. Returns a token on success."""
    # If password is empty or not provided, default it to the username
    if not payload.password:
        payload.password = payload.username
    user = create_user(payload.username, payload.password)
    if not user:
        raise HTTPException(status_code=400, detail="Username already exists")
    token = create_access_token({"sub": payload.username})
    return {"access_token": token, "token_type": "bearer"}


@app.post("/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends()):
    """Login with username & password (OAuth2 password form)."""
    user = authenticate_user(form_data.username, form_data.password)
    if not user:
        raise HTTPException(status_code=400, detail="Incorrect username or password")
    token = create_access_token({"sub": form_data.username})
    return {"access_token": token, "token_type": "bearer"}


@app.get("/user/me")
def read_current_user(current_user=Depends(get_current_user)):
    # Return user info and progress
    user = dict(current_user)
    # compute xp progress toward next level
    xp = user.get("xp", 0)
    level = calculate_level(xp)
    xp_in_level = xp % 100
    return {
        "username": user["username"],
        "xp": xp,
        "level": level,
        "xp_in_level": xp_in_level,
        "streak": user.get("streak", 0),
        "achievements": list(filter(None, (user.get("achievements") or "").split(","))),
        "daily_goal": user.get("daily_goal", "")
    }


@app.post("/habits/complete")
def complete_daily_goal(current_user=Depends(get_current_user)):
    """Mark today's daily goal as completed for the authenticated user.

    This endpoint updates XP and streak. It returns the updated user progress.
    """
    username = current_user["username"]
    conn = get_db()
    c = conn.cursor()
    today = datetime.date.today().isoformat()
    last = current_user["last_completed_date"]

    # Determine if streak continues
    streak = current_user["streak"] or 0
    if last == today:
        # already completed today
        raise HTTPException(status_code=400, detail="Already completed today")
    if last:
        last_date = datetime.date.fromisoformat(last)
        if last_date == datetime.date.today() - datetime.timedelta(days=1):
            streak += 1
        else:
            streak = 1
    else:
        streak = 1

    # XP award: base 20 XP + 2 XP per streak day (encourages longer streaks)
    base_xp = 20
    bonus = max(0, streak - 1) * 2
    gained = base_xp + bonus
    new_xp = (current_user["xp"] or 0) + gained
    new_level = calculate_level(new_xp)

    # update achievements
    achievements, awarded = maybe_add_achievement(current_user, new_xp)

    c.execute(
        "UPDATE users SET xp = ?, streak = ?, level = ?, last_completed_date = ?, achievements = ? WHERE username = ?",
        (new_xp, streak, new_level, today, ",".join(achievements), username),
    )
    conn.commit()
    return {
        "gained": gained,
        "xp": new_xp,
        "level": new_level,
        "streak": streak,
        "awarded": awarded,
        "daily_goal": current_user.get("daily_goal", "")
    }


@app.get("/leaderboard")
def leaderboard(limit: int = 10):
    """Return top users by XP."""
    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT username, xp, level, streak FROM users ORDER BY xp DESC LIMIT ?", (limit,))
    rows = c.fetchall()
    return [dict(r) for r in rows]


@app.post("/habits/goal")
def set_daily_goal(payload: dict, current_user=Depends(get_current_user)):
    """Set the user's daily goal text."""
    goal = (payload.get("goal") or "").strip()
    conn = get_db()
    c = conn.cursor()
    c.execute("UPDATE users SET daily_goal = ? WHERE username = ?", (goal, current_user["username"]))
    conn.commit()
    return {"daily_goal": goal}


@app.get("/summary/weekly")
def weekly_summary(current_user=Depends(get_current_user)):
    """Return a mocked 'AI' weekly summary using the user's progress.

    In a real app this would call an AI service. Here we return a friendly summary.
    """
    username = current_user["username"]
    xp = current_user.get("xp", 0)
    streak = current_user.get("streak", 0)
    # Simple templated summary
    summary = (
        f"Hey {username}! This week you earned {xp} XP total and have a {streak}-day streak. "
        "Keep focusing on consistency — try to add one more goal next week!"
    )
    return {"summary": summary}


@app.get("/achievements")
def get_achievements(current_user=Depends(get_current_user)):
    return {"achievements": list(filter(None, (current_user.get("achievements") or "").split(",")))}
import uvicorn

if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)