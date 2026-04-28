"""Claude AI helpers using emergentintegrations."""
import os
import json
import re
import base64
import uuid
from typing import List, Optional
from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent

EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY")
CLAUDE_MODEL = "claude-sonnet-4-5-20250929"


def _make_chat(system_message: str, session_id: Optional[str] = None) -> LlmChat:
    return LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=session_id or f"sp-{uuid.uuid4().hex[:12]}",
        system_message=system_message,
    ).with_model("anthropic", CLAUDE_MODEL)


def _truncate(text: str, max_chars: int = 60000) -> str:
    if len(text) <= max_chars:
        return text
    return text[:max_chars] + "\n\n[...truncated for length]"


def _extract_json(text: str):
    """Extract JSON array/object from LLM text."""
    text = text.strip()
    # Remove markdown code fences
    text = re.sub(r"^```(?:json)?\s*", "", text)
    text = re.sub(r"\s*```$", "", text)
    # Try direct parse
    try:
        return json.loads(text)
    except Exception:
        pass
    # Try to find first {...} or [...] block
    for pattern in [r"\[.*\]", r"\{.*\}"]:
        m = re.search(pattern, text, re.DOTALL)
        if m:
            try:
                return json.loads(m.group(0))
            except Exception:
                continue
    raise ValueError(f"Could not parse JSON from: {text[:300]}")


async def generate_notes(raw_text: str, depth: str = "summarized") -> str:
    """Returns markdown notes."""
    depth_instructions = {
        "summarized": "Brief, concise bullet-point notes hitting only key concepts. ~300-500 words.",
        "in-depth": "Detailed structured notes with headers, sub-points, and key terms bolded. ~800-1200 words.",
        "comprehensive": "Exhaustive notes covering everything: definitions, examples, formulas, key insights. 1500+ words.",
    }
    system = (
        "You are an expert academic note-maker. Create well-structured study notes "
        "in clean Markdown format. Use #, ##, ### headers, **bold** for key terms, "
        "and - bullet lists. NO preamble, output notes directly."
    )
    chat = _make_chat(system)
    msg = UserMessage(
        text=f"Depth: {depth_instructions[depth]}\n\n"
        f"Source content:\n{_truncate(raw_text)}\n\n"
        f"Generate the notes now in Markdown."
    )
    return await chat.send_message(msg)


async def generate_flashcards(raw_text: str, n: int = 12) -> List[dict]:
    system = (
        "You are an expert flashcard creator. Output ONLY a valid JSON array, no preamble, "
        "no markdown fences. Each item: {\"front\": term/question, \"back\": definition/answer}."
    )
    chat = _make_chat(system)
    msg = UserMessage(
        text=f"Create exactly {n} high-quality flashcards from this content. "
        f"Cover the most important concepts.\n\nContent:\n{_truncate(raw_text, 40000)}\n\n"
        f"Output only the JSON array."
    )
    resp = await chat.send_message(msg)
    return _extract_json(resp)


async def generate_quiz(raw_text: str, n: int = 10) -> List[dict]:
    system = (
        "You are an expert quiz designer. Output ONLY a valid JSON array, no preamble, no fences. "
        "Each item: {\"type\": \"mcq\" or \"tf\", \"question\": str, \"options\": [4 strings for mcq, "
        "[\"True\",\"False\"] for tf], \"answer\": exact option string, \"explanation\": str}."
    )
    chat = _make_chat(system)
    msg = UserMessage(
        text=f"Create exactly {n} quiz questions from this content. Mix ~7 MCQ and ~3 True/False. "
        f"Each MCQ has 4 plausible options. Include a clear 1-2 sentence explanation per question.\n\n"
        f"Content:\n{_truncate(raw_text, 40000)}\n\nOutput JSON array only."
    )
    resp = await chat.send_message(msg)
    return _extract_json(resp)


async def generate_arcade_match(raw_text: str) -> List[dict]:
    system = "Output ONLY JSON array of {\"term\": str, \"definition\": str (concise, <12 words)}."
    chat = _make_chat(system)
    msg = UserMessage(
        text=f"Create exactly 4 term-definition pairs (memory match game) from this content. "
        f"Definitions must be SHORT (<12 words).\n\n{_truncate(raw_text, 30000)}\n\nJSON only."
    )
    return _extract_json(await chat.send_message(msg))


async def generate_arcade_fill(raw_text: str) -> List[dict]:
    system = (
        "Output ONLY JSON array of {\"sentence\": str (with '_____' blank), \"answer\": str (one word/phrase)}."
    )
    chat = _make_chat(system)
    msg = UserMessage(
        text=f"Create exactly 12 fill-in-the-blank sentences from this content. "
        f"Replace ONE key term in each with '_____'. The answer should be 1-3 words.\n\n"
        f"{_truncate(raw_text, 30000)}\n\nJSON only."
    )
    return _extract_json(await chat.send_message(msg))


async def generate_arcade_blitz(raw_text: str) -> List[dict]:
    system = (
        "Output ONLY JSON array of {\"statement\": str, \"is_true\": bool, \"explanation\": str}."
    )
    chat = _make_chat(system)
    msg = UserMessage(
        text=f"Create exactly 10 True/False statements from this content. "
        f"Mix true and false roughly 50/50. Make the false ones plausible but clearly incorrect.\n\n"
        f"{_truncate(raw_text, 30000)}\n\nJSON only."
    )
    return _extract_json(await chat.send_message(msg))


async def chat_with_context(
    raw_text: str,
    history: List[dict],
    user_message: str,
    session_id: str,
    ultra: bool = False,
    language: str = "English",
) -> str:
    style = "Think step-by-step deeply, show reasoning, give thorough answers." if ultra else "Be concise and helpful."
    system = (
        f"You are Spark.E, a friendly AI tutor for StudyPilot. Answer ONLY based on the provided "
        f"study material below. If the question is outside the material, say so politely and suggest "
        f"related topics from the material. Always answer in {language}. {style}\n\n"
        f"=== STUDY MATERIAL ===\n{_truncate(raw_text, 50000)}\n=== END MATERIAL ==="
    )
    chat = _make_chat(system, session_id=session_id)
    # Send history as a single context block + new message
    history_text = ""
    if history:
        for h in history[-10:]:
            role = "User" if h.get("role") == "user" else "Spark.E"
            history_text += f"{role}: {h.get('message','')}\n"
    full_msg = f"{history_text}User: {user_message}" if history_text else user_message
    return await chat.send_message(UserMessage(text=full_msg))


async def analyse_image(image_base64: str, prompt: str) -> str:
    system = "You are Spark.E, a study assistant. Analyse images for educational purposes."
    chat = _make_chat(system)
    # Strip data URL prefix if present
    if "," in image_base64 and image_base64.startswith("data:"):
        image_base64 = image_base64.split(",", 1)[1]
    img = ImageContent(image_base64=image_base64)
    msg = UserMessage(text=prompt, file_contents=[img])
    return await chat.send_message(msg)


async def grade_essay(essay: str) -> dict:
    system = (
        "You are an expert essay grader. Output ONLY JSON: "
        "{\"score\": int 0-100, \"grammar_issues\": [str], \"structure_feedback\": str, "
        "\"suggestions\": [str], \"strengths\": [str]}."
    )
    chat = _make_chat(system)
    msg = UserMessage(
        text=f"Grade this essay rigorously and give actionable feedback.\n\nEssay:\n{essay[:15000]}\n\nJSON only."
    )
    return _extract_json(await chat.send_message(msg))


async def schedule_study_plan(subject: str, exam_date: str, raw_text: str = "") -> List[dict]:
    system = (
        "You are a study planner. Output ONLY JSON array of "
        "{\"date\": \"YYYY-MM-DD\", \"title\": str, \"duration_mins\": int, \"topic\": str}."
    )
    chat = _make_chat(system)
    extra = f"\nMaterial topics: {_truncate(raw_text, 5000)}" if raw_text else ""
    msg = UserMessage(
        text=f"Create a backwards study plan from today (start spread sessions out) until exam_date={exam_date} "
        f"for subject={subject}. Include 6-10 sessions, 45-90 mins each, with specific topics.{extra}\n\nJSON only."
    )
    return _extract_json(await chat.send_message(msg))
