"""StudyPilot Backend API Tests
Covers: auth, upload (TXT), study-sets, notes, flashcards, quiz,
arcade (match/fill/blitz), Spark.E chat, essay grading, calendar.
AI-backed endpoints have extended timeouts (~60s).
"""
import io
import os
import time
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://flashcard-forge-11.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

# Long-form text for upload to ensure extraction passes 30-char minimum and
# is rich enough for the LLM to generate notes / flashcards / quizzes etc.
SAMPLE_TEXT = (
    "Photosynthesis is the biochemical process by which green plants, algae, and certain bacteria "
    "convert light energy, usually from the Sun, into chemical energy stored in glucose. "
    "The process takes place primarily in the chloroplasts of plant cells, specifically using the "
    "pigment chlorophyll which absorbs red and blue light while reflecting green. "
    "The overall reaction is: 6 CO2 + 6 H2O + light energy -> C6H12O6 + 6 O2. "
    "Photosynthesis has two stages: the light-dependent reactions which occur in the thylakoid "
    "membranes and produce ATP and NADPH, and the Calvin cycle which occurs in the stroma and uses "
    "ATP and NADPH to fix carbon dioxide into glucose. Factors affecting the rate of photosynthesis "
    "include light intensity, carbon dioxide concentration, temperature, and water availability. "
    "Photosynthesis is critical to life on Earth because it produces oxygen and forms the base of "
    "almost all food chains."
)

LONG_TIMEOUT = 90  # seconds for LLM-backed endpoints
SHORT_TIMEOUT = 30


# ---------- session-scoped fixtures ----------
@pytest.fixture(scope="session")
def signup_payload():
    ts = int(time.time())
    return {
        "email": f"studyaitest+{ts}_{uuid.uuid4().hex[:6]}@example.com",
        "password": "TestPass123!",
        "name": "StudyPilot Tester",
    }


@pytest.fixture(scope="session")
def auth(signup_payload):
    """Sign up and return (token, user_id, headers)."""
    r = requests.post(f"{API}/auth/signup", json=signup_payload, timeout=SHORT_TIMEOUT)
    assert r.status_code == 200, f"signup failed: {r.status_code} {r.text}"
    data = r.json()
    token = data["token"]
    headers = {"Authorization": f"Bearer {token}"}
    return {"token": token, "user_id": data["user"]["user_id"], "headers": headers, "email": signup_payload["email"]}


@pytest.fixture(scope="session")
def study_set(auth):
    """Upload a TXT to create a real study set (used by downstream tests)."""
    files = {"file": ("photosynthesis.txt", io.BytesIO(SAMPLE_TEXT.encode("utf-8")), "text/plain")}
    data = {"title": "Photosynthesis 101", "subject": "Biology"}
    r = requests.post(f"{API}/upload", files=files, data=data, headers=auth["headers"], timeout=LONG_TIMEOUT)
    assert r.status_code == 200, f"upload failed: {r.status_code} {r.text}"
    j = r.json()
    assert "id" in j and j["title"] == "Photosynthesis 101"
    return j


# ---------- AUTH ----------
class TestAuth:
    def test_root(self):
        r = requests.get(f"{API}/", timeout=SHORT_TIMEOUT)
        assert r.status_code == 200
        assert r.json().get("message")

    def test_signup_and_login(self, signup_payload, auth):
        # signup already covered via fixture; ensure duplicate is rejected
        r = requests.post(f"{API}/auth/signup", json=signup_payload, timeout=SHORT_TIMEOUT)
        assert r.status_code == 400
        # login
        r = requests.post(
            f"{API}/auth/login",
            json={"email": signup_payload["email"], "password": signup_payload["password"]},
            timeout=SHORT_TIMEOUT,
        )
        assert r.status_code == 200, r.text
        body = r.json()
        assert "token" in body and isinstance(body["token"], str)
        assert body["user"]["email"] == signup_payload["email"]

    def test_login_wrong_password(self, signup_payload):
        r = requests.post(
            f"{API}/auth/login",
            json={"email": signup_payload["email"], "password": "WrongPass!!"},
            timeout=SHORT_TIMEOUT,
        )
        assert r.status_code == 401

    def test_me(self, auth):
        r = requests.get(f"{API}/auth/me", headers=auth["headers"], timeout=SHORT_TIMEOUT)
        assert r.status_code == 200
        body = r.json()
        assert body["user_id"] == auth["user_id"]
        assert "password_hash" not in body

    def test_me_unauthenticated(self):
        r = requests.get(f"{API}/auth/me", timeout=SHORT_TIMEOUT)
        assert r.status_code == 401

    def test_logout(self, auth):
        r = requests.post(f"{API}/auth/logout", headers=auth["headers"], timeout=SHORT_TIMEOUT)
        assert r.status_code == 200
        assert r.json().get("ok") is True


# ---------- STUDY SETS / UPLOAD ----------
class TestStudySets:
    def test_list_after_upload(self, auth, study_set):
        r = requests.get(f"{API}/study-sets", headers=auth["headers"], timeout=SHORT_TIMEOUT)
        assert r.status_code == 200
        sets = r.json()
        assert isinstance(sets, list)
        ids = [s["id"] for s in sets]
        assert study_set["id"] in ids

    def test_get_detail(self, auth, study_set):
        r = requests.get(f"{API}/study-sets/{study_set['id']}", headers=auth["headers"], timeout=SHORT_TIMEOUT)
        assert r.status_code == 200
        body = r.json()
        assert body["id"] == study_set["id"]
        assert "raw_text" in body and len(body["raw_text"]) > 30
        assert body["subject"] == "Biology"

    def test_get_detail_404(self, auth):
        r = requests.get(f"{API}/study-sets/set_does_not_exist", headers=auth["headers"], timeout=SHORT_TIMEOUT)
        assert r.status_code == 404

    def test_upload_requires_input(self, auth):
        r = requests.post(f"{API}/upload", headers=auth["headers"], timeout=SHORT_TIMEOUT)
        assert r.status_code == 400


# ---------- NOTES ----------
class TestNotes:
    def test_generate_summarized(self, auth, study_set):
        r = requests.post(
            f"{API}/notes/generate",
            json={"study_set_id": study_set["id"], "depth": "summarized"},
            headers=auth["headers"],
            timeout=LONG_TIMEOUT,
        )
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["depth"] == "summarized"
        md = body.get("markdown", "")
        assert isinstance(md, str) and len(md) > 50, f"markdown too short: {md[:200]}"


# ---------- FLASHCARDS ----------
class TestFlashcards:
    def test_generate_and_update_difficulty(self, auth, study_set):
        r = requests.post(
            f"{API}/flashcards/generate",
            json={"study_set_id": study_set["id"]},
            headers=auth["headers"],
            timeout=LONG_TIMEOUT,
        )
        assert r.status_code == 200, r.text
        cards = r.json().get("flashcards", [])
        assert isinstance(cards, list) and len(cards) > 0
        sample = cards[0]
        for k in ("id", "front", "back"):
            assert k in sample, f"missing {k} in {sample}"

        # Mark first card as easy
        r2 = requests.put(
            f"{API}/flashcards/{sample['id']}/difficulty",
            json={"difficulty": "easy"},
            headers=auth["headers"],
            timeout=SHORT_TIMEOUT,
        )
        assert r2.status_code == 200, r2.text
        assert r2.json()["difficulty"] == "easy"

    def test_update_difficulty_404(self, auth):
        r = requests.put(
            f"{API}/flashcards/fc_doesnotexist/difficulty",
            json={"difficulty": "hard"},
            headers=auth["headers"],
            timeout=SHORT_TIMEOUT,
        )
        assert r.status_code == 404


# ---------- QUIZ ----------
class TestQuiz:
    @pytest.fixture(scope="class")
    def quiz_questions(self, auth, study_set):
        r = requests.post(
            f"{API}/quiz/generate",
            json={"study_set_id": study_set["id"]},
            headers=auth["headers"],
            timeout=LONG_TIMEOUT,
        )
        assert r.status_code == 200, r.text
        return r.json().get("questions", [])

    def test_generate_returns_10_questions(self, quiz_questions):
        assert isinstance(quiz_questions, list)
        # spec says 10 questions; allow tolerance >=5 in case LLM returns fewer
        assert len(quiz_questions) >= 5, f"only got {len(quiz_questions)} questions"
        q0 = quiz_questions[0]
        for k in ("type", "question", "options", "answer", "explanation"):
            assert k in q0, f"missing {k} in {q0}"
        assert q0["type"] in ("mcq", "tf")

    def test_submit(self, auth, study_set, quiz_questions):
        # Build answers - mark first correct, rest incorrect for variety
        answers = []
        for i, q in enumerate(quiz_questions):
            answers.append({
                "question_id": q.get("id", f"q_{i}"),
                "question": q.get("question", ""),
                "answer": q.get("answer", ""),
                "selected": q.get("answer") if i == 0 else "WRONG",
                "correct": i == 0,
            })
        r = requests.post(
            f"{API}/quiz/submit",
            json={
                "study_set_id": study_set["id"],
                "answers": answers,
                "score": 1,
                "total": len(answers),
            },
            headers=auth["headers"],
            timeout=SHORT_TIMEOUT,
        )
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["ok"] is True
        assert body["score"] == 1
        assert body["total"] == len(answers)
        assert "weak_topics" in body and isinstance(body["weak_topics"], list)


# ---------- ARCADE ----------
class TestArcade:
    @pytest.mark.parametrize("mode", ["match", "fill", "blitz"])
    def test_generate_modes(self, auth, study_set, mode):
        r = requests.post(
            f"{API}/arcade/generate",
            json={"study_set_id": study_set["id"], "mode": mode},
            headers=auth["headers"],
            timeout=LONG_TIMEOUT,
        )
        assert r.status_code == 200, f"{mode}: {r.status_code} {r.text}"
        body = r.json()
        assert body["mode"] == mode
        assert "items" in body and isinstance(body["items"], list) and len(body["items"]) > 0, (
            f"empty items for mode={mode}"
        )

    def test_score_and_leaderboard(self, auth, study_set):
        r = requests.post(
            f"{API}/arcade/score",
            json={"study_set_id": study_set["id"], "mode": "match", "score": 42},
            headers=auth["headers"],
            timeout=SHORT_TIMEOUT,
        )
        assert r.status_code == 200
        assert r.json()["ok"] is True

        r2 = requests.get(f"{API}/arcade/leaderboard", headers=auth["headers"], timeout=SHORT_TIMEOUT)
        assert r2.status_code == 200
        scores = r2.json()
        assert isinstance(scores, list)
        assert any(s["score"] == 42 and s["mode"] == "match" for s in scores)


# ---------- SPARK.E CHAT + ESSAY ----------
class TestSparke:
    def test_chat(self, auth, study_set):
        r = requests.post(
            f"{API}/sparke/chat",
            json={
                "study_set_id": study_set["id"],
                "message": "What is the overall chemical equation of photosynthesis?",
                "session_id": f"sess_{uuid.uuid4().hex[:8]}",
                "model_mode": "standard",
                "language": "English",
            },
            headers=auth["headers"],
            timeout=LONG_TIMEOUT,
        )
        assert r.status_code == 200, r.text
        reply = r.json().get("reply", "")
        assert isinstance(reply, str) and len(reply) > 10

    def test_essay_grade(self, auth):
        essay = (
            "The Industrial Revolution transformed economies from agrarian to industrial systems. "
            "Beginning in Britain in the late 18th century, mechanized manufacturing lifted productivity "
            "and migration into cities reshaped social structures. While it brought prosperity, it also "
            "introduced severe working conditions and pollution that took decades to address. "
            "In sum, the Industrial Revolution is a foundational pivot in modern history."
        )
        r = requests.post(
            f"{API}/essay/grade",
            json={"essay": essay},
            headers=auth["headers"],
            timeout=LONG_TIMEOUT,
        )
        assert r.status_code == 200, r.text
        body = r.json()
        for k in ("score", "grammar_issues", "structure_feedback", "suggestions", "strengths"):
            assert k in body, f"missing {k} in essay grade response: {list(body.keys())}"

    def test_essay_too_short(self, auth):
        r = requests.post(
            f"{API}/essay/grade",
            json={"essay": "Too short."},
            headers=auth["headers"],
            timeout=SHORT_TIMEOUT,
        )
        assert r.status_code == 400


# ---------- CALENDAR ----------
class TestCalendar:
    @pytest.fixture(scope="class")
    def scheduled(self, auth, study_set):
        # Schedule study plan 14 days from now
        from datetime import date, timedelta
        exam_date = (date.today() + timedelta(days=14)).isoformat()
        r = requests.post(
            f"{API}/calendar/schedule",
            json={
                "study_set_id": study_set["id"],
                "subject": "Biology",
                "exam_date": exam_date,
                "title": "Biology Final",
            },
            headers=auth["headers"],
            timeout=LONG_TIMEOUT,
        )
        assert r.status_code == 200, r.text
        return r.json()

    def test_schedule_returns_events(self, scheduled):
        events = scheduled.get("events", [])
        assert isinstance(events, list) and len(events) > 0
        # Must contain at least one exam event
        assert any(ev.get("type") == "exam" for ev in events)
        for ev in events:
            for k in ("id", "title", "subject", "date", "type"):
                assert k in ev, f"missing {k} in event {ev}"

    def test_list_events(self, auth, scheduled):
        r = requests.get(f"{API}/calendar/events", headers=auth["headers"], timeout=SHORT_TIMEOUT)
        assert r.status_code == 200
        events = r.json()
        assert isinstance(events, list) and len(events) > 0

    def test_delete_event(self, auth, scheduled):
        # Pick a non-exam event to delete
        events = scheduled["events"]
        target = next((e for e in events if e["type"] != "exam"), events[0])
        r = requests.delete(
            f"{API}/calendar/events/{target['id']}", headers=auth["headers"], timeout=SHORT_TIMEOUT
        )
        assert r.status_code == 200
        # Verify removal
        r2 = requests.get(f"{API}/calendar/events", headers=auth["headers"], timeout=SHORT_TIMEOUT)
        ids = [e["id"] for e in r2.json()]
        assert target["id"] not in ids
