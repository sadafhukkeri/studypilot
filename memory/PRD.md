# StudyPilot — PRD

## Original problem statement
Build a full-stack AI-powered education platform called "StudyPilot" — a clone of studyfetch.com. Production-ready desktop web application for students to upload study materials and get AI-generated learning tools.

## User personas
- **University students** preparing for exams from lecture notes, slide decks, textbooks
- **Self-learners** consuming YouTube lectures and online materials
- **Test-prep students** wanting gamified review (flashcards, quizzes, arcade games)

## Core requirements (static)
- Dark-theme, desktop-only SaaS app
- Upload PDF/DOCX/PPT/TXT/PNG/JPEG/YouTube
- AI-generated: Notes, Flashcards, Quizzes, Arcade games (3 modes), Spark.E chat tutor, Image analysis, Essay grading, Study Calendar
- Pages: Landing, Auth, Dashboard, Upload, Study Set hub, Notes, Flashcards, Quiz, Spark.E (3 tabs), Arcade, Calendar, Settings
- NO Stripe / payments / pricing / mobile / lecture / group-study / podcasts / voice

## Architecture
- Frontend: React 19 + Tailwind + craco + framer-motion + jspdf
- Backend: FastAPI on port 8001
- DB: MongoDB
- Auth: Hybrid — JWT email/password + Emergent Google OAuth (session_token cookie)
- AI: Claude Sonnet 4.5 via Emergent Universal Key (`emergentintegrations`)
- Storage: Local filesystem (`/app/backend/uploads`)

## What's been implemented (2026-02)
### Backend
- `models.py`, `auth.py`, `ai.py`, `extractors.py`, `server.py`
- All 18 API endpoints (signup, login, google-session, me, logout, upload, study-sets list/detail, notes, flashcards generate/difficulty, quiz generate/submit, arcade generate/score/leaderboard, sparke chat/image, essay grade, calendar schedule/events/delete)
- Text extraction: PDF (PyMuPDF), DOCX, PPTX, TXT, image (Claude vision), YouTube (transcript-api)
- Claude integration via emergentintegrations (`claude-sonnet-4-5-20250929`)

### Frontend
- 14 pages: Landing, Login, Signup, AuthCallback, Dashboard, StudySetsList, StudySet, Notes, Flashcards, Quiz, SparkChat (3 tabs), Arcade, ArcadeGame (3 modes), Calendar, Settings
- Components: Logo, Sidebar, AppShell, UploadDropzone, ProtectedRoute
- Custom dark theme with Plus Jakarta Sans + DM Sans, glassmorphism, glow effects, framer-motion 3D flip

## v2 — 2026-02 (rename + Indian-student features)
### Renamed
- All "StudyAI" → "StudyPilot"; all "Spark.E" → "StudyPilot AI"
- Routes: `/sparke` → `/studypilotai`; meta titles/description updated; KaTeX CDN added

### New backend endpoints (11)
- `POST /api/studypilotai/voice` — multilingual text-in/text-out tutor (browser-based STT/TTS)
- `POST /api/studypilotai/snap` — Claude-vision photo-to-doubt with KaTeX-rendered solutions
- `POST /api/wellbeing/mood`, `GET /api/wellbeing/mood/history`
- `GET /api/wellbeing/burnout-score` (deterministic formula)
- `GET /api/wellbeing/daily-spark`, `POST /api/wellbeing/daily-spark/refresh`
- `GET /api/wellbeing/streak` (current/longest/30-day heatmap)
- `POST /api/reels/generate`, `GET /api/reels/{study_set_id}` (5 reels per set)
- `POST /api/notes/explain-three-ways`

### New frontend pages
- VoiceTutorPage (Web Speech API STT/TTS, 7 Indian languages)
- WellbeingPage (mood, burnout, daily spark, streak heatmap)
- ReelsPage (vertical 390×693 reel feed, WhatsApp share)
- SparkChatPage: added "Snap & Solve" 4th tab with KaTeX rendering
- NotesPage: added "Explain it 3 ways" floating tooltip on text selection + side panel

## Backlog (P0/P1/P2)
- P1: Streaming chat replies (currently full-response)
- P1: True spaced-repetition algorithm based on difficulty taps
- P2: Reel `force=true` regenerate flag
- P2: Wellbeing timezone awareness for daily spark reset
- P2: Saved chat sessions list / resume past sessions
- P2: Export flashcards to Anki/CSV
- P2: Share study set with public link
