# StudyPilot — AI-Powered Education Platform

A full-stack education platform that turns any uploaded document, slide deck, lecture, or YouTube video into AI-generated study tools: notes, flashcards, quizzes, a personal AI tutor, gamified arcade modes, and an auto-scheduled study calendar.

> A clone of studyfetch.com — built with React + FastAPI + MongoDB + Claude Sonnet 4.5.

---

## Features

- **Notes AI** — structured Markdown notes at 3 depths (Summarized / In-Depth / Comprehensive), exportable to PDF
- **Flashcards** — 3D-flip animated cards with spaced-repetition difficulty tracking
- **Quiz Generator** — 10 mixed MCQ + True/False questions with instant feedback and weak-topic analysis
- **Spark.E Tutor** — ChatGPT-style assistant grounded in your study material; 3 tabs:
  - Chat (with Standard / Ultra Thinking modes, 20+ languages)
  - Image / Diagram Analyser (Claude vision)
  - Essay Grader (score, grammar issues, structure feedback, suggestions)
- **Arcade** — 3 game modes:
  1. Match the Term (memory grid with timer + score)
  2. Fill-in-Blank Race (60s typing race)
  3. True/False Blitz (10 rapid-fire statements at 5s each)
- **Study Calendar** — AI auto-schedules study sessions backwards from your exam date, color-coded by subject
- **Upload pipeline** — PDF, DOCX, PPTX, TXT, PNG/JPEG, YouTube URL

---

## Tech Stack

| Layer        | Tech                                                  |
| ------------ | ----------------------------------------------------- |
| Frontend     | React 19 + Tailwind CSS + craco + framer-motion       |
| Backend      | FastAPI (Python 3.11) + motor (async MongoDB)         |
| Database     | MongoDB                                               |
| AI           | Claude Sonnet 4.5 via `emergentintegrations`          |
| Auth         | JWT (email/password) + Emergent-managed Google OAuth  |
| Storage      | Local filesystem (`backend/uploads/`)                 |

---

## Local Setup

### Prerequisites
- Python 3.11+
- Node.js 18+ and Yarn
- MongoDB running locally (default: `mongodb://localhost:27017`)

### 1. Clone & install
```bash
git clone <repo-url> studypilot
cd studypilot
```

### 2. Backend
```bash
cd backend
pip install -r requirements.txt

# Create .env file
cat > .env <<'EOF'
MONGO_URL=mongodb://localhost:27017
DB_NAME=studypilot
CORS_ORIGINS=*
EMERGENT_LLM_KEY=sk-emergent-7A69c5107CdB981Ac2
JWT_SECRET=your-secret-here
EOF

# Run backend (port 8001 by default; pass --port 8000 if you prefer)
uvicorn server:app --reload --host 0.0.0.0 --port 8001
```

### 3. Frontend
```bash
cd ../frontend
yarn install

# Create .env file
cat > .env <<'EOF'
REACT_APP_BACKEND_URL=http://localhost:8001
EOF

yarn start  # opens http://localhost:3000
```

### 4. Open the app
Visit [http://localhost:3000](http://localhost:3000), sign up via email or Google, then upload a document and explore the tools.

---

## Project structure
```
/app
├── backend/
│   ├── server.py              # FastAPI app + all routes
│   ├── models.py              # Pydantic models
│   ├── auth.py                # JWT + Google OAuth helpers
│   ├── ai.py                  # Claude integration helpers
│   ├── extractors.py          # PDF/DOCX/PPT/YouTube text extraction
│   ├── uploads/               # User-uploaded files (gitignored)
│   └── requirements.txt
└── frontend/
    ├── src/
    │   ├── App.js             # Router + AuthProvider
    │   ├── pages/             # All 14 pages
    │   ├── components/        # Sidebar, AppShell, UploadDropzone, etc.
    │   ├── contexts/          # AuthContext
    │   └── lib/api.js         # Axios instance
    └── package.json
```

---

## API Endpoints (all `/api` prefix)

| Method | Path                                       | Description                          |
| ------ | ------------------------------------------ | ------------------------------------ |
| POST   | `/auth/signup`                             | Email/password signup                |
| POST   | `/auth/login`                              | Email/password login                 |
| POST   | `/auth/google-session`                     | Exchange Emergent OAuth session_id   |
| GET    | `/auth/me`                                 | Current user                         |
| POST   | `/auth/logout`                             | Logout                               |
| POST   | `/upload`                                  | Upload file or YouTube URL           |
| GET    | `/study-sets`                              | List user's study sets               |
| GET    | `/study-sets/{id}`                         | Get one study set                    |
| POST   | `/notes/generate`                          | Generate notes (depth toggle)        |
| POST   | `/flashcards/generate`                     | Generate flashcards                  |
| PUT    | `/flashcards/{id}/difficulty`              | Mark flashcard difficulty            |
| POST   | `/quiz/generate`                           | Generate 10-question quiz            |
| POST   | `/quiz/submit`                             | Submit quiz answers                  |
| POST   | `/arcade/generate`                         | Generate game content (mode)         |
| POST   | `/arcade/score`                            | Save arcade score                    |
| GET    | `/arcade/leaderboard`                      | User's score history                 |
| POST   | `/sparke/chat`                             | Chat with Spark.E                    |
| POST   | `/sparke/image`                            | Image analyser                       |
| POST   | `/essay/grade`                             | Essay grader                         |
| POST   | `/calendar/schedule`                       | AI-schedule study plan               |
| GET    | `/calendar/events`                         | List events                          |
| DELETE | `/calendar/events/{id}`                    | Delete event                         |

---

## Design

- Color palette: `#0a0a0f` (bg), `#111118` (cards), `#1a1a2a` (surfaces), `#4f6ef7` (primary blue), `#00c4cc` (teal), `#f5a623` (gold)
- Typography: Plus Jakarta Sans (headings), DM Sans (body)
- Effects: glassmorphism, glow shadows, 3D card flip, micro-animations

---

## License
MIT — built for educational/portfolio use.
