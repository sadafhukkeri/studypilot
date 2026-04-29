"""Pydantic models for StudyPilot."""
from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import List, Optional, Literal
from datetime import datetime, timezone
import uuid


def _utcnow():
    return datetime.now(timezone.utc)


class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    user_id: str = Field(default_factory=lambda: f"user_{uuid.uuid4().hex[:12]}")
    email: str
    name: str
    picture: Optional[str] = None
    auth_provider: Literal["email", "google"] = "email"
    created_at: datetime = Field(default_factory=_utcnow)


class SignupRequest(BaseModel):
    email: EmailStr
    password: str
    name: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class StudySet(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: f"set_{uuid.uuid4().hex[:12]}")
    user_id: str
    title: str
    subject: str = "General"
    raw_text: str = ""
    file_url: Optional[str] = None
    file_type: Optional[str] = None
    source_type: Literal["file", "youtube", "text"] = "file"
    created_at: datetime = Field(default_factory=_utcnow)


class StudySetSummary(BaseModel):
    id: str
    title: str
    subject: str
    source_type: str
    created_at: datetime


class GenerateRequest(BaseModel):
    study_set_id: str


class NotesRequest(BaseModel):
    study_set_id: str
    depth: Literal["summarized", "in-depth", "comprehensive"] = "summarized"


class Flashcard(BaseModel):
    id: str = Field(default_factory=lambda: f"fc_{uuid.uuid4().hex[:10]}")
    study_set_id: str
    front: str
    back: str
    difficulty: Literal["new", "easy", "hard", "again"] = "new"


class FlashcardDifficultyUpdate(BaseModel):
    difficulty: Literal["easy", "hard", "again"]


class QuizQuestion(BaseModel):
    id: str = Field(default_factory=lambda: f"q_{uuid.uuid4().hex[:8]}")
    type: Literal["mcq", "tf"]
    question: str
    options: List[str] = []
    answer: str
    explanation: str = ""


class QuizSubmission(BaseModel):
    study_set_id: str
    answers: List[dict]  # [{question_id, selected, correct, question, answer}]
    score: int
    total: int


class ArcadeGenerateRequest(BaseModel):
    study_set_id: str
    mode: Literal["match", "fill", "blitz"]


class ArcadeScore(BaseModel):
    study_set_id: str
    mode: Literal["match", "fill", "blitz"]
    score: int
    extra: Optional[dict] = None


class ChatRequest(BaseModel):
    study_set_id: str
    message: str
    session_id: str
    model_mode: Literal["standard", "ultra"] = "standard"
    language: str = "English"


class ImageAnalyseRequest(BaseModel):
    study_set_id: Optional[str] = None
    image_base64: str
    prompt: Optional[str] = "Explain what this image shows in detail for studying."


class EssayGradeRequest(BaseModel):
    essay: str


class CalendarScheduleRequest(BaseModel):
    study_set_id: Optional[str] = None
    subject: str
    exam_date: str  # ISO date
    title: str = "Exam"


class CalendarEvent(BaseModel):
    id: str = Field(default_factory=lambda: f"evt_{uuid.uuid4().hex[:10]}")
    user_id: str
    title: str
    subject: str
    date: str  # ISO date
    duration_mins: int = 60
    type: Literal["session", "exam", "deadline"] = "session"
    topic: str = ""


# ==================== NEW MODELS ====================
class VoiceChatRequest(BaseModel):
    study_set_id: str
    transcript_user: str
    language: str = "English"
    session_id: str


class SnapSolveRequest(BaseModel):
    image_base64: str
    subject_hint: Optional[str] = ""


class MoodCheckinRequest(BaseModel):
    mood: int  # 1-5
    note: Optional[str] = ""


class ExplainThreeWaysRequest(BaseModel):
    text: str


class AudioRecapRequest(BaseModel):
    study_set_id: str
    format: Literal["podcast", "lecture", "audiobook", "summary"]
    length_minutes: int = 6
    voice_a: Optional[str] = "Neutral"
    voice_b: Optional[str] = "Female-Warm"


class ExplainerRequest(BaseModel):
    study_set_id: Optional[str] = None
    topic: Optional[str] = ""
    style: Literal["classic", "story", "conversation"] = "classic"
    length_minutes: int = 10
