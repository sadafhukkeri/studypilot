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

## v3 — 2026-02 (Audio Recap + Explainer + TTS hardening)

### Bug fixes
- **Voice Tutor language enforcement**: backend prompt now includes BCP-47 locale (Hindi→hi-IN etc.) and forbids English mid-sentence; frontend uses `tts.js` helper to pick locale-matched voice, rate=0.9, pitch=1.0
- **Reels animation + audio**: full TikTok-style refactor — typewriter hook, staggered point fade-in, gradient backgrounds (5 rotating), keyboard/wheel/touch swipe, auto-narration on slide change, mute/unmute, progress dots, play-hint overlay
- **Global TTS cleaner** (`/app/frontend/src/lib/tts.js`) — strips markdown bold/italic/headers/links/code-fences, all emoji ranges, bullet symbols, underscores. Used everywhere `speak()` is called.

### New backend endpoints
- `POST /api/audio-recap/generate`, `GET /api/audio-recap`, `GET /api/audio-recap/{id}`
- `POST /api/explainer/generate`, `GET /api/explainer`, `GET /api/explainer/{id}`
- All wrapped with try/except → 503 on transient LLM gateway errors

### New frontend pages
- `AudioRecapPage` (`/study-set/:id/audio-recap`) — 4 formats × 6 lengths × 7 voices, Web Speech API playback with auto-advance segments, speed control, transcript with active-segment highlight, script download
- `AudioRecapOverviewPage` (`/audio-recap`) — gallery of past recaps + "Create New" picker modal
- `ExplainerPage` (`/explainer`) — Tab toggle (study set / topic) × 3 styles × 4 lengths, animated slide viewer with typewriter title + staggered content, SVG diagram render, autoplay (8s), fullscreen, print-as-PDF, narration via TTS, gallery

### New MongoDB collections
- `audio_recaps`, `explainers`

### Sidebar
- Added "Audio Recap" (headphone icon) → `/audio-recap`
- Added "Explainer" (play-circle icon) → `/explainer`

### StudySetPage tool grid
- Added 7th card "Audio Recap" → `/study-set/:id/audio-recap`
