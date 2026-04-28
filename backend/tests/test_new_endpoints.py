"""StudyPilot NEW endpoints regression tests.

Covers:
- POST /api/studypilotai/voice
- POST /api/studypilotai/snap
- POST /api/wellbeing/mood
- GET  /api/wellbeing/mood/history
- GET  /api/wellbeing/burnout-score
- GET  /api/wellbeing/daily-spark
- POST /api/wellbeing/daily-spark/refresh
- GET  /api/wellbeing/streak
- POST /api/reels/generate
- GET  /api/reels/{study_set_id}
- POST /api/notes/explain-three-ways

LLM-backed endpoints get a 120s timeout each.
"""
import base64
import io
import os
import time
import uuid
import pytest
import requests

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")
API = f"{BASE_URL}/api"

LONG_TIMEOUT = 120
SHORT_TIMEOUT = 30

SAMPLE_TEXT = (
    "Photosynthesis is the biochemical process by which green plants, algae, and certain bacteria "
    "convert light energy, usually from the Sun, into chemical energy stored in glucose. "
    "The overall reaction is: 6 CO2 + 6 H2O + light energy -> C6H12O6 + 6 O2. "
    "Photosynthesis has two stages: the light-dependent reactions which occur in the thylakoid "
    "membranes and produce ATP and NADPH, and the Calvin cycle which occurs in the stroma and uses "
    "ATP and NADPH to fix carbon dioxide into glucose. Factors affecting the rate of photosynthesis "
    "include light intensity, carbon dioxide concentration, temperature, and water availability."
)

def _make_math_jpeg_b64() -> str:
    """Generate a small but valid JPEG with a math problem (Claude-accepted)."""
    from PIL import Image, ImageDraw
    img = Image.new("RGB", (300, 100), "white")
    d = ImageDraw.Draw(img)
    d.text((10, 30), "Solve: 2x + 3 = 11", fill="black")
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=85)
    return base64.b64encode(buf.getvalue()).decode()


TINY_JPEG_B64 = _make_math_jpeg_b64()


# ---------- session-scoped fixtures ----------
@pytest.fixture(scope="session")
def auth():
    payload = {
        "email": f"newep+{int(time.time())}_{uuid.uuid4().hex[:6]}@example.com",
        "password": "TestPass123!",
        "name": "NewEP Tester",
    }
    r = requests.post(f"{API}/auth/signup", json=payload, timeout=SHORT_TIMEOUT)
    assert r.status_code == 200, f"signup failed: {r.status_code} {r.text}"
    data = r.json()
    return {
        "headers": {"Authorization": f"Bearer {data['token']}"},
        "user_id": data["user"]["user_id"],
        "name": data["user"]["name"],
    }


@pytest.fixture(scope="session")
def study_set(auth):
    files = {"file": ("photo.txt", io.BytesIO(SAMPLE_TEXT.encode("utf-8")), "text/plain")}
    data = {"title": "Photosynthesis NewEP", "subject": "Biology"}
    r = requests.post(f"{API}/upload", files=files, data=data, headers=auth["headers"], timeout=LONG_TIMEOUT)
    assert r.status_code == 200, f"upload failed: {r.status_code} {r.text}"
    return r.json()


# ---------- VOICE ----------
class TestVoice:
    def test_voice_hindi(self, auth, study_set):
        r = requests.post(
            f"{API}/studypilotai/voice",
            json={
                "study_set_id": study_set["id"],
                "transcript_user": "What is photosynthesis?",
                "language": "Hindi",
                "session_id": f"voice_{uuid.uuid4().hex[:8]}",
            },
            headers=auth["headers"],
            timeout=LONG_TIMEOUT,
        )
        assert r.status_code == 200, r.text
        body = r.json()
        for k in ("transcript_user", "response_text", "language_used"):
            assert k in body, f"missing {k} in {body}"
        assert body["transcript_user"] == "What is photosynthesis?"
        assert body["language_used"] == "Hindi"
        assert isinstance(body["response_text"], str) and len(body["response_text"]) > 5


# ---------- SNAP ----------
class TestSnap:
    def test_snap_solve(self, auth):
        r = requests.post(
            f"{API}/studypilotai/snap",
            json={"image_base64": TINY_JPEG_B64, "subject_hint": "Math"},
            headers=auth["headers"],
            timeout=LONG_TIMEOUT,
        )
        assert r.status_code == 200, r.text
        body = r.json()
        for k in ("problem_extracted", "solution_steps", "concept_tested", "similar_questions"):
            assert k in body, f"missing {k} in {list(body.keys())}"
        assert isinstance(body["solution_steps"], list)
        assert isinstance(body["similar_questions"], list)


# ---------- WELLBEING ----------
class TestWellbeing:
    def test_mood_checkin(self, auth):
        r = requests.post(
            f"{API}/wellbeing/mood",
            json={"mood": 3, "note": "Feeling tired today"},
            headers=auth["headers"],
            timeout=LONG_TIMEOUT,
        )
        assert r.status_code == 200, r.text
        body = r.json()
        assert "ai_response" in body and isinstance(body["ai_response"], str) and len(body["ai_response"]) > 5
        assert body["mood_label"] == "Okay"

    def test_mood_history(self, auth):
        r = requests.get(f"{API}/wellbeing/mood/history", headers=auth["headers"], timeout=SHORT_TIMEOUT)
        assert r.status_code == 200, r.text
        items = r.json()
        assert isinstance(items, list) and len(items) >= 1
        first = items[0]
        for k in ("mood", "mood_label", "note", "ai_response", "created_at"):
            assert k in first, f"missing {k} in mood history item"

    def test_burnout_score(self, auth):
        r = requests.get(f"{API}/wellbeing/burnout-score", headers=auth["headers"], timeout=LONG_TIMEOUT)
        assert r.status_code == 200, r.text
        body = r.json()
        for k in ("score", "state", "sessions_last_7d", "low_mood_count", "suggestions"):
            assert k in body, f"missing {k} in {list(body.keys())}"
        assert 0 <= body["score"] <= 100
        assert body["state"] in ("healthy", "caution", "burnout")
        assert isinstance(body["suggestions"], list)

    def test_daily_spark(self, auth):
        r = requests.get(f"{API}/wellbeing/daily-spark", headers=auth["headers"], timeout=LONG_TIMEOUT)
        assert r.status_code == 200, r.text
        body = r.json()
        assert "message" in body and isinstance(body["message"], str) and len(body["message"]) > 5
        assert "date" in body
        # Second call should return cached same message for same date
        r2 = requests.get(f"{API}/wellbeing/daily-spark", headers=auth["headers"], timeout=SHORT_TIMEOUT)
        assert r2.status_code == 200
        assert r2.json()["message"] == body["message"]

    def test_daily_spark_refresh(self, auth):
        r = requests.post(f"{API}/wellbeing/daily-spark/refresh", headers=auth["headers"], timeout=LONG_TIMEOUT)
        assert r.status_code == 200, r.text
        body = r.json()
        assert "message" in body and isinstance(body["message"], str) and len(body["message"]) > 5
        assert "date" in body

    def test_streak(self, auth):
        r = requests.get(f"{API}/wellbeing/streak", headers=auth["headers"], timeout=SHORT_TIMEOUT)
        assert r.status_code == 200, r.text
        body = r.json()
        for k in ("current_streak", "longest_streak", "heatmap"):
            assert k in body, f"missing {k}"
        assert isinstance(body["heatmap"], list) and len(body["heatmap"]) == 30
        for cell in body["heatmap"]:
            assert "date" in cell and "count" in cell


# ---------- REELS ----------
class TestReels:
    def test_generate_reels(self, auth, study_set):
        r = requests.post(
            f"{API}/reels/generate",
            json={"study_set_id": study_set["id"]},
            headers=auth["headers"],
            timeout=LONG_TIMEOUT,
        )
        assert r.status_code == 200, r.text
        body = r.json()
        reels = body.get("reels", [])
        assert isinstance(reels, list) and len(reels) >= 3, f"only got {len(reels)} reels"
        first = reels[0]
        for k in ("id", "study_set_id", "title", "hook", "points", "analogy", "takeaway", "script_text", "created_at"):
            assert k in first, f"missing {k} in reel: {list(first.keys())}"
        assert first["study_set_id"] == study_set["id"]
        assert isinstance(first["points"], list)

    def test_get_reels_by_study_set(self, auth, study_set):
        r = requests.get(f"{API}/reels/{study_set['id']}", headers=auth["headers"], timeout=SHORT_TIMEOUT)
        assert r.status_code == 200, r.text
        body = r.json()
        assert isinstance(body.get("reels"), list) and len(body["reels"]) > 0

    def test_get_reels_404(self, auth):
        r = requests.get(f"{API}/reels/set_does_not_exist", headers=auth["headers"], timeout=SHORT_TIMEOUT)
        assert r.status_code == 404


# ---------- EXPLAIN THREE WAYS ----------
class TestExplainThreeWays:
    def test_explain(self, auth):
        r = requests.post(
            f"{API}/notes/explain-three-ways",
            json={"text": "Photosynthesis is the process by which plants convert sunlight into chemical energy stored as glucose."},
            headers=auth["headers"],
            timeout=LONG_TIMEOUT,
        )
        assert r.status_code == 200, r.text
        body = r.json()
        for k in ("simple", "exam", "advanced"):
            assert k in body, f"missing {k}"
            assert isinstance(body[k], str) and len(body[k]) > 10

    def test_explain_too_short(self, auth):
        r = requests.post(
            f"{API}/notes/explain-three-ways",
            json={"text": "hi"},
            headers=auth["headers"],
            timeout=SHORT_TIMEOUT,
        )
        assert r.status_code == 400


# ---------- AUTH GUARDS (sanity) ----------
class TestAuthGuards:
    def test_voice_unauthenticated(self):
        r = requests.post(
            f"{API}/studypilotai/voice",
            json={"study_set_id": "x", "transcript_user": "x", "language": "English", "session_id": "x"},
            timeout=SHORT_TIMEOUT,
        )
        assert r.status_code == 401

    def test_mood_history_unauthenticated(self):
        r = requests.get(f"{API}/wellbeing/mood/history", timeout=SHORT_TIMEOUT)
        assert r.status_code == 401
