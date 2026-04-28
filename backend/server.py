"""StudyPilot — FastAPI server."""
from fastapi import FastAPI, APIRouter, UploadFile, File, Form, Request, Response, HTTPException, Depends
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import uuid
from pathlib import Path
from datetime import datetime, timezone, timedelta
from typing import List, Optional

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

# MongoDB
mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

UPLOAD_DIR = ROOT_DIR / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

import models
import auth as auth_lib
import ai
import extractors

app = FastAPI(title="StudyPilot API")
api = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("studypilot")


async def current_user(request: Request):
    return await auth_lib.get_current_user(request, db)


def _utcnow():
    return datetime.now(timezone.utc)


def _serialize(d: dict) -> dict:
    """Convert datetimes to ISO strings for JSON response."""
    out = {}
    for k, v in d.items():
        if isinstance(v, datetime):
            out[k] = v.isoformat()
        else:
            out[k] = v
    return out


# ==================== AUTH ====================
@api.get("/")
async def root():
    return {"message": "StudyPilot API", "version": "1.0"}


@api.post("/auth/signup")
async def signup(payload: models.SignupRequest):
    existing = await db.users.find_one({"email": payload.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    user = models.User(email=payload.email, name=payload.name, auth_provider="email")
    user_doc = user.model_dump()
    user_doc["created_at"] = user_doc["created_at"].isoformat()
    user_doc["password_hash"] = auth_lib.hash_password(payload.password)
    await db.users.insert_one(user_doc)
    token = auth_lib.create_jwt(user.user_id)
    return {
        "token": token,
        "user": {"user_id": user.user_id, "email": user.email, "name": user.name, "picture": user.picture},
    }


@api.post("/auth/login")
async def login(payload: models.LoginRequest):
    user = await db.users.find_one({"email": payload.email}, {"_id": 0})
    if not user or not user.get("password_hash"):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not auth_lib.verify_password(payload.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = auth_lib.create_jwt(user["user_id"])
    return {
        "token": token,
        "user": {
            "user_id": user["user_id"],
            "email": user["email"],
            "name": user["name"],
            "picture": user.get("picture"),
        },
    }


@api.post("/auth/google-session")
async def google_session(request: Request, response: Response):
    body = await request.json()
    session_id = body.get("session_id")
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id required")
    data = await auth_lib.fetch_emergent_session(session_id)
    email = data["email"]
    # Find or create user
    existing = await db.users.find_one({"email": email}, {"_id": 0})
    if existing:
        user_id = existing["user_id"]
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {"name": data.get("name") or existing.get("name"), "picture": data.get("picture")}},
        )
    else:
        user = models.User(
            email=email,
            name=data.get("name") or email.split("@")[0],
            picture=data.get("picture"),
            auth_provider="google",
        )
        doc = user.model_dump()
        doc["created_at"] = doc["created_at"].isoformat()
        await db.users.insert_one(doc)
        user_id = user.user_id

    # Save session
    expires_at = _utcnow() + timedelta(days=7)
    await db.user_sessions.insert_one({
        "user_id": user_id,
        "session_token": data["session_token"],
        "expires_at": expires_at,
        "created_at": _utcnow(),
    })
    response.set_cookie(
        key="session_token",
        value=data["session_token"],
        max_age=7 * 24 * 60 * 60,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
    )
    user_doc = await db.users.find_one({"user_id": user_id}, {"_id": 0, "password_hash": 0})
    return {"user": user_doc}


@api.get("/auth/me")
async def me(user=Depends(current_user)):
    safe = {k: v for k, v in user.items() if k not in ("password_hash",)}
    return safe


@api.post("/auth/logout")
async def logout(request: Request, response: Response):
    token = request.cookies.get("session_token")
    if token:
        await db.user_sessions.delete_one({"session_token": token})
    response.delete_cookie("session_token", path="/")
    return {"ok": True}


# ==================== UPLOAD ====================
@api.post("/upload")
async def upload(
    request: Request,
    file: Optional[UploadFile] = File(None),
    youtube_url: Optional[str] = Form(None),
    title: Optional[str] = Form(None),
    subject: Optional[str] = Form("General"),
    user=Depends(current_user),
):
    raw_text = ""
    file_url = None
    file_type = None
    source_type = "file"
    final_title = title or "Untitled Study Set"

    if youtube_url:
        try:
            raw_text, video_id = extractors.extract_youtube(youtube_url)
            source_type = "youtube"
            file_url = f"https://youtu.be/{video_id}"
            file_type = "youtube"
            if not title:
                final_title = f"YouTube: {video_id}"
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"YouTube extraction failed: {e}")
    elif file:
        content = await file.read()
        ext = (file.filename or "").lower().split(".")[-1]
        file_type = ext
        # Save file
        safe_name = f"{uuid.uuid4().hex[:10]}_{file.filename}"
        path = UPLOAD_DIR / safe_name
        path.write_bytes(content)
        file_url = f"/uploads/{safe_name}"

        if ext in ("png", "jpg", "jpeg", "webp"):
            # Image: use Claude vision to extract description
            b64 = extractors.image_to_base64(content)
            raw_text = await ai.analyse_image(
                b64,
                "Extract ALL text and describe ALL visible educational content from this image in detail. "
                "Format as study notes if possible.",
            )
            source_type = "file"
        else:
            try:
                raw_text = extractors.extract_text_from_upload(file.filename, content)
            except Exception as e:
                raise HTTPException(status_code=400, detail=f"Extraction failed: {e}")
        if not title:
            final_title = file.filename or "Untitled"
    else:
        raise HTTPException(status_code=400, detail="Provide a file or youtube_url")

    if not raw_text or len(raw_text.strip()) < 30:
        raise HTTPException(status_code=400, detail="Could not extract meaningful text from source.")

    study_set = models.StudySet(
        user_id=user["user_id"],
        title=final_title[:200],
        subject=subject or "General",
        raw_text=raw_text,
        file_url=file_url,
        file_type=file_type,
        source_type=source_type,
    )
    doc = study_set.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    await db.study_sets.insert_one(doc)
    return {
        "id": study_set.id,
        "title": study_set.title,
        "subject": study_set.subject,
        "source_type": study_set.source_type,
        "created_at": doc["created_at"],
    }


# ==================== STUDY SETS ====================
@api.get("/study-sets")
async def list_study_sets(user=Depends(current_user)):
    docs = await db.study_sets.find(
        {"user_id": user["user_id"]},
        {"_id": 0, "raw_text": 0},
    ).sort("created_at", -1).to_list(200)
    return docs


@api.get("/study-sets/{set_id}")
async def get_study_set(set_id: str, user=Depends(current_user)):
    doc = await db.study_sets.find_one(
        {"id": set_id, "user_id": user["user_id"]}, {"_id": 0}
    )
    if not doc:
        raise HTTPException(status_code=404, detail="Not found")
    return doc


async def _get_set(set_id: str, user_id: str) -> dict:
    doc = await db.study_sets.find_one({"id": set_id, "user_id": user_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Study set not found")
    return doc


# ==================== NOTES ====================
@api.post("/notes/generate")
async def notes_generate(payload: models.NotesRequest, user=Depends(current_user)):
    s = await _get_set(payload.study_set_id, user["user_id"])
    cached = await db.notes.find_one(
        {"study_set_id": payload.study_set_id, "depth": payload.depth}, {"_id": 0}
    )
    if cached:
        return {"markdown": cached["markdown"], "depth": payload.depth}
    md = await ai.generate_notes(s["raw_text"], payload.depth)
    await db.notes.insert_one({
        "study_set_id": payload.study_set_id,
        "depth": payload.depth,
        "markdown": md,
        "created_at": _utcnow().isoformat(),
    })
    return {"markdown": md, "depth": payload.depth}


# ==================== FLASHCARDS ====================
@api.post("/flashcards/generate")
async def flashcards_generate(payload: models.GenerateRequest, user=Depends(current_user)):
    s = await _get_set(payload.study_set_id, user["user_id"])
    existing = await db.flashcards.find(
        {"study_set_id": payload.study_set_id}, {"_id": 0}
    ).to_list(200)
    if existing:
        return {"flashcards": existing}
    items = await ai.generate_flashcards(s["raw_text"], n=12)
    cards = []
    for it in items:
        c = models.Flashcard(
            study_set_id=payload.study_set_id,
            front=it.get("front", ""),
            back=it.get("back", ""),
        )
        cards.append(c.model_dump())
    if cards:
        await db.flashcards.insert_many([{**c} for c in cards])
    # Re-fetch without _id
    out = await db.flashcards.find(
        {"study_set_id": payload.study_set_id}, {"_id": 0}
    ).to_list(200)
    return {"flashcards": out}


@api.put("/flashcards/{fc_id}/difficulty")
async def flashcard_difficulty(
    fc_id: str, payload: models.FlashcardDifficultyUpdate, user=Depends(current_user)
):
    res = await db.flashcards.update_one(
        {"id": fc_id}, {"$set": {"difficulty": payload.difficulty}}
    )
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Flashcard not found")
    return {"ok": True, "difficulty": payload.difficulty}


# ==================== QUIZ ====================
@api.post("/quiz/generate")
async def quiz_generate(payload: models.GenerateRequest, user=Depends(current_user)):
    s = await _get_set(payload.study_set_id, user["user_id"])
    items = await ai.generate_quiz(s["raw_text"], n=10)
    questions = []
    for it in items:
        q = models.QuizQuestion(
            type=it.get("type", "mcq"),
            question=it.get("question", ""),
            options=it.get("options", []),
            answer=it.get("answer", ""),
            explanation=it.get("explanation", ""),
        )
        questions.append(q.model_dump())
    return {"questions": questions}


@api.post("/quiz/submit")
async def quiz_submit(payload: models.QuizSubmission, user=Depends(current_user)):
    doc = {
        "id": f"qa_{uuid.uuid4().hex[:10]}",
        "user_id": user["user_id"],
        "study_set_id": payload.study_set_id,
        "score": payload.score,
        "total": payload.total,
        "answers": payload.answers,
        "created_at": _utcnow().isoformat(),
    }
    await db.quiz_attempts.insert_one(doc)
    # Find weak topics from incorrect answers
    weak = [a.get("question", "")[:80] for a in payload.answers if not a.get("correct")]
    return {"ok": True, "score": payload.score, "total": payload.total, "weak_topics": weak[:5]}


# ==================== ARCADE ====================
@api.post("/arcade/generate")
async def arcade_generate(payload: models.ArcadeGenerateRequest, user=Depends(current_user)):
    s = await _get_set(payload.study_set_id, user["user_id"])
    if payload.mode == "match":
        return {"mode": "match", "items": await ai.generate_arcade_match(s["raw_text"])}
    if payload.mode == "fill":
        return {"mode": "fill", "items": await ai.generate_arcade_fill(s["raw_text"])}
    if payload.mode == "blitz":
        return {"mode": "blitz", "items": await ai.generate_arcade_blitz(s["raw_text"])}
    raise HTTPException(status_code=400, detail="Unknown mode")


@api.post("/arcade/score")
async def arcade_score(payload: models.ArcadeScore, user=Depends(current_user)):
    doc = {
        "id": f"as_{uuid.uuid4().hex[:10]}",
        "user_id": user["user_id"],
        "study_set_id": payload.study_set_id,
        "mode": payload.mode,
        "score": payload.score,
        "extra": payload.extra or {},
        "created_at": _utcnow().isoformat(),
    }
    await db.arcade_scores.insert_one(doc)
    return {"ok": True}


@api.get("/arcade/leaderboard")
async def arcade_leaderboard(user=Depends(current_user)):
    scores = await db.arcade_scores.find(
        {"user_id": user["user_id"]}, {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    # Attach study set titles
    set_ids = list({s["study_set_id"] for s in scores})
    sets = await db.study_sets.find(
        {"id": {"$in": set_ids}}, {"_id": 0, "id": 1, "title": 1}
    ).to_list(200)
    title_map = {s["id"]: s["title"] for s in sets}
    for s in scores:
        s["study_set_title"] = title_map.get(s["study_set_id"], "Unknown")
    return scores


# ==================== SPARK.E CHAT ====================
@api.post("/sparke/chat")
async def sparke_chat(payload: models.ChatRequest, user=Depends(current_user)):
    s = await _get_set(payload.study_set_id, user["user_id"])
    # Load history
    history = await db.chats.find(
        {"user_id": user["user_id"], "session_id": payload.session_id},
        {"_id": 0},
    ).sort("created_at", 1).to_list(50)
    reply = await ai.chat_with_context(
        s["raw_text"],
        history,
        payload.message,
        session_id=payload.session_id,
        ultra=(payload.model_mode == "ultra"),
        language=payload.language,
    )
    now = _utcnow().isoformat()
    await db.chats.insert_many([
        {
            "user_id": user["user_id"],
            "session_id": payload.session_id,
            "study_set_id": payload.study_set_id,
            "role": "user",
            "message": payload.message,
            "created_at": now,
        },
        {
            "user_id": user["user_id"],
            "session_id": payload.session_id,
            "study_set_id": payload.study_set_id,
            "role": "assistant",
            "message": reply,
            "created_at": now,
        },
    ])
    return {"reply": reply}


@api.get("/sparke/chat/history")
async def sparke_chat_history(session_id: str, user=Depends(current_user)):
    history = await db.chats.find(
        {"user_id": user["user_id"], "session_id": session_id}, {"_id": 0}
    ).sort("created_at", 1).to_list(200)
    return history


@api.post("/sparke/image")
async def sparke_image(payload: models.ImageAnalyseRequest, user=Depends(current_user)):
    explanation = await ai.analyse_image(payload.image_base64, payload.prompt or "Explain this diagram.")
    return {"explanation": explanation}


@api.post("/essay/grade")
async def essay_grade(payload: models.EssayGradeRequest, user=Depends(current_user)):
    if len(payload.essay.strip()) < 50:
        raise HTTPException(status_code=400, detail="Essay too short")
    result = await ai.grade_essay(payload.essay)
    return result


# ==================== CALENDAR ====================
@api.post("/calendar/schedule")
async def calendar_schedule(payload: models.CalendarScheduleRequest, user=Depends(current_user)):
    raw_text = ""
    if payload.study_set_id:
        s = await db.study_sets.find_one(
            {"id": payload.study_set_id, "user_id": user["user_id"]}, {"_id": 0}
        )
        if s:
            raw_text = s["raw_text"][:5000]
    sessions = await ai.schedule_study_plan(payload.subject, payload.exam_date, raw_text)
    events = []
    # Add the exam itself
    exam_evt = models.CalendarEvent(
        user_id=user["user_id"],
        title=payload.title,
        subject=payload.subject,
        date=payload.exam_date,
        type="exam",
        topic="Exam Day",
    )
    events.append(exam_evt.model_dump())
    for s in sessions:
        ev = models.CalendarEvent(
            user_id=user["user_id"],
            title=s.get("title", "Study Session"),
            subject=payload.subject,
            date=s.get("date", payload.exam_date),
            duration_mins=s.get("duration_mins", 60),
            type="session",
            topic=s.get("topic", ""),
        )
        events.append(ev.model_dump())
    if events:
        await db.calendar_events.insert_many([{**e} for e in events])
    out = await db.calendar_events.find(
        {"user_id": user["user_id"]}, {"_id": 0}
    ).sort("date", 1).to_list(500)
    return {"events": out}


@api.get("/calendar/events")
async def calendar_events(user=Depends(current_user)):
    out = await db.calendar_events.find(
        {"user_id": user["user_id"]}, {"_id": 0}
    ).sort("date", 1).to_list(500)
    return out


@api.delete("/calendar/events/{event_id}")
async def calendar_delete(event_id: str, user=Depends(current_user)):
    await db.calendar_events.delete_one({"id": event_id, "user_id": user["user_id"]})
    return {"ok": True}


# ==================== VOICE TUTOR ====================
@api.post("/studypilotai/voice")
async def studypilotai_voice(payload: models.VoiceChatRequest, user=Depends(current_user)):
    s = await _get_set(payload.study_set_id, user["user_id"])
    reply = await ai.voice_chat(s["raw_text"], payload.transcript_user, payload.language, payload.session_id)
    now = _utcnow().isoformat()
    await db.chats.insert_many([
        {"user_id": user["user_id"], "session_id": payload.session_id, "study_set_id": payload.study_set_id,
         "role": "user", "message": payload.transcript_user, "created_at": now, "channel": "voice"},
        {"user_id": user["user_id"], "session_id": payload.session_id, "study_set_id": payload.study_set_id,
         "role": "assistant", "message": reply, "created_at": now, "channel": "voice"},
    ])
    return {"transcript_user": payload.transcript_user, "response_text": reply, "language_used": payload.language}


# ==================== SNAP & SOLVE ====================
@api.post("/studypilotai/snap")
async def studypilotai_snap(payload: models.SnapSolveRequest, user=Depends(current_user)):
    try:
        return await ai.snap_solve(payload.image_base64, payload.subject_hint or "")
    except Exception as e:
        msg = str(e)
        if "image" in msg.lower() or "vision" in msg.lower() or "could not process" in msg.lower():
            raise HTTPException(status_code=400, detail="Could not process image. Please retry with a clearer photo.")
        raise HTTPException(status_code=500, detail=f"Snap & Solve failed: {msg[:120]}")


# ==================== WELLBEING ====================
MOOD_LABELS = {1: "Struggling", 2: "Stressed", 3: "Okay", 4: "Good", 5: "Great"}


@api.post("/wellbeing/mood")
async def wellbeing_mood(payload: models.MoodCheckinRequest, user=Depends(current_user)):
    label = MOOD_LABELS.get(payload.mood, "Okay")
    response = await ai.mood_response(label, payload.note or "", user.get("name", ""))
    doc = {
        "id": f"mood_{uuid.uuid4().hex[:10]}",
        "user_id": user["user_id"],
        "mood": payload.mood,
        "mood_label": label,
        "note": payload.note or "",
        "ai_response": response,
        "created_at": _utcnow().isoformat(),
    }
    await db.mood_checkins.insert_one(doc)
    return {"ai_response": response, "mood_label": label}


@api.get("/wellbeing/mood/history")
async def wellbeing_mood_history(user=Depends(current_user)):
    items = await db.mood_checkins.find(
        {"user_id": user["user_id"]}, {"_id": 0}
    ).sort("created_at", -1).limit(30).to_list(30)
    return items


@api.get("/wellbeing/burnout-score")
async def wellbeing_burnout(user=Depends(current_user)):
    uid = user["user_id"]
    now = _utcnow()
    seven_ago = (now - timedelta(days=7)).isoformat()

    chat_count = await db.chats.count_documents({"user_id": uid, "created_at": {"$gte": seven_ago}, "role": "user"})
    quiz_count = await db.quiz_attempts.count_documents({"user_id": uid, "created_at": {"$gte": seven_ago}})
    arcade_count = await db.arcade_scores.count_documents({"user_id": uid, "created_at": {"$gte": seven_ago}})
    mood_low = await db.mood_checkins.count_documents({"user_id": uid, "created_at": {"$gte": seven_ago}, "mood": {"$lte": 2}})
    again_count = await db.flashcards.count_documents({"difficulty": "again"})

    sessions = chat_count + quiz_count + arcade_count
    # Activity heat = sessions per day average
    avg_per_day = sessions / 7.0
    # Score 0-100, higher = more risk
    score = min(int(avg_per_day * 8 + mood_low * 12 + min(again_count, 20) * 1.5), 100)

    if score >= 70:
        state = "burnout"
    elif score >= 40:
        state = "caution"
    else:
        state = "healthy"

    suggestions = []
    if state == "burnout":
        try:
            suggestions = await ai.burnout_suggestions()
        except Exception:
            suggestions = [
                "Take a 20-minute walk away from your screen.",
                "Skip one study session today and rest fully.",
                "Talk to a friend or family member about how you feel.",
            ]

    return {
        "score": score,
        "state": state,
        "sessions_last_7d": sessions,
        "low_mood_count": mood_low,
        "suggestions": suggestions,
    }


@api.get("/wellbeing/daily-spark")
async def wellbeing_daily_spark(user=Depends(current_user)):
    today = _utcnow().date().isoformat()
    cached = await db.daily_sparks.find_one(
        {"user_id": user["user_id"], "date": today}, {"_id": 0}
    )
    if cached:
        return {"message": cached["message"], "date": today}
    # Get most recent study set subject
    last = await db.study_sets.find_one(
        {"user_id": user["user_id"]}, {"_id": 0, "subject": 1}, sort=[("created_at", -1)]
    )
    subject = last.get("subject", "") if last else ""
    msg = await ai.daily_spark(user.get("name", ""), subject)
    await db.daily_sparks.insert_one({"user_id": user["user_id"], "date": today, "message": msg})
    return {"message": msg, "date": today}


@api.post("/wellbeing/daily-spark/refresh")
async def wellbeing_daily_spark_refresh(user=Depends(current_user)):
    today = _utcnow().date().isoformat()
    last = await db.study_sets.find_one(
        {"user_id": user["user_id"]}, {"_id": 0, "subject": 1}, sort=[("created_at", -1)]
    )
    subject = last.get("subject", "") if last else ""
    msg = await ai.daily_spark(user.get("name", ""), subject)
    await db.daily_sparks.update_one(
        {"user_id": user["user_id"], "date": today},
        {"$set": {"message": msg}},
        upsert=True,
    )
    return {"message": msg, "date": today}


@api.get("/wellbeing/streak")
async def wellbeing_streak(user=Depends(current_user)):
    uid = user["user_id"]
    now = _utcnow()
    thirty_ago = now - timedelta(days=30)
    # Pull all activity timestamps in last 30 days from key collections
    cursors = [
        db.chats.find({"user_id": uid, "created_at": {"$gte": thirty_ago.isoformat()}}, {"_id": 0, "created_at": 1}),
        db.quiz_attempts.find({"user_id": uid, "created_at": {"$gte": thirty_ago.isoformat()}}, {"_id": 0, "created_at": 1}),
        db.arcade_scores.find({"user_id": uid, "created_at": {"$gte": thirty_ago.isoformat()}}, {"_id": 0, "created_at": 1}),
        db.mood_checkins.find({"user_id": uid, "created_at": {"$gte": thirty_ago.isoformat()}}, {"_id": 0, "created_at": 1}),
        db.study_sets.find({"user_id": uid, "created_at": {"$gte": thirty_ago.isoformat()}}, {"_id": 0, "created_at": 1}),
    ]
    days_set = set()
    daily_counts = {}
    for cur in cursors:
        async for d in cur:
            ts = d.get("created_at")
            if not ts:
                continue
            try:
                day = ts[:10]
                days_set.add(day)
                daily_counts[day] = daily_counts.get(day, 0) + 1
            except Exception:
                pass
    # Streak: consecutive days from today backwards
    today = now.date()
    streak = 0
    for i in range(60):
        d = (today - timedelta(days=i)).isoformat()
        if d in days_set:
            streak += 1
        else:
            if i == 0:
                # Allow today gap; check yesterday
                continue
            break
    # Longest streak in last 60 days
    longest = 0
    cur_run = 0
    for i in range(60):
        d = (today - timedelta(days=i)).isoformat()
        if d in days_set:
            cur_run += 1
            longest = max(longest, cur_run)
        else:
            cur_run = 0
    # 30-day heatmap
    heatmap = []
    for i in range(29, -1, -1):
        d = (today - timedelta(days=i)).isoformat()
        heatmap.append({"date": d, "count": daily_counts.get(d, 0)})
    return {"current_streak": streak, "longest_streak": longest, "heatmap": heatmap}


# ==================== REELS ====================
@api.post("/reels/generate")
async def reels_generate(payload: models.GenerateRequest, user=Depends(current_user)):
    s = await _get_set(payload.study_set_id, user["user_id"])
    existing = await db.reels.find(
        {"study_set_id": payload.study_set_id}, {"_id": 0}
    ).to_list(50)
    if existing:
        return {"reels": existing}
    items = await ai.generate_reels(s["raw_text"], n=5)
    reels = []
    now = _utcnow().isoformat()
    for it in items:
        reels.append({
            "id": f"reel_{uuid.uuid4().hex[:10]}",
            "study_set_id": payload.study_set_id,
            "title": it.get("title", ""),
            "hook": it.get("hook", ""),
            "points": it.get("points", []),
            "analogy": it.get("analogy", ""),
            "takeaway": it.get("takeaway", ""),
            "script_text": it.get("script_text", ""),
            "created_at": now,
        })
    if reels:
        await db.reels.insert_many([{**r} for r in reels])
    out = await db.reels.find({"study_set_id": payload.study_set_id}, {"_id": 0}).to_list(50)
    return {"reels": out}


@api.get("/reels/{study_set_id}")
async def reels_list(study_set_id: str, user=Depends(current_user)):
    await _get_set(study_set_id, user["user_id"])
    out = await db.reels.find({"study_set_id": study_set_id}, {"_id": 0}).to_list(50)
    return {"reels": out}


# ==================== EXPLAIN THREE WAYS ====================
@api.post("/notes/explain-three-ways")
async def notes_explain_three_ways(payload: models.ExplainThreeWaysRequest, user=Depends(current_user)):
    if len(payload.text.strip()) < 10:
        raise HTTPException(status_code=400, detail="Text too short")
    return await ai.explain_three_ways(payload.text)


# Mount router
app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
