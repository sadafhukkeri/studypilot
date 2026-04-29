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
        f"You are StudyPilot AI, a friendly AI tutor for StudyPilot. Answer ONLY based on the provided "
        f"study material below. If the question is outside the material, say so politely and suggest "
        f"related topics from the material. Always answer in {language}. {style}\n\n"
        f"=== STUDY MATERIAL ===\n{_truncate(raw_text, 50000)}\n=== END MATERIAL ==="
    )
    chat = _make_chat(system, session_id=session_id)
    # Send history as a single context block + new message
    history_text = ""
    if history:
        for h in history[-10:]:
            role = "User" if h.get("role") == "user" else "StudyPilot AI"
            history_text += f"{role}: {h.get('message','')}\n"
    full_msg = f"{history_text}User: {user_message}" if history_text else user_message
    return await chat.send_message(UserMessage(text=full_msg))


async def analyse_image(image_base64: str, prompt: str) -> str:
    system = "You are StudyPilot AI, a study assistant. Analyse images for educational purposes."
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


# ==================== NEW HELPERS ====================
LANGUAGE_LOCALES = {
    "english": "en-US",
    "hindi": "hi-IN",
    "tamil": "ta-IN",
    "telugu": "te-IN",
    "marathi": "mr-IN",
    "bengali": "bn-IN",
    "gujarati": "gu-IN",
}


async def voice_chat(raw_text: str, message: str, language: str, session_id: str) -> str:
    locale = LANGUAGE_LOCALES.get(language.strip().lower(), "en-US")
    system = (
        f"You are a voice AI tutor for StudyPilot. The student is speaking in {language} (locale {locale}). "
        f"You MUST reply 100% in {language} only. Do NOT mix English words unless the concept has absolutely "
        f"no translation — in that case, pronounce the English term using {language} phonetics and immediately "
        f"explain it in {language}. Never switch to English mid-sentence. "
        f"Keep replies CONVERSATIONAL and concise (under 80 words) so they can be spoken aloud. "
        f"Answer ONLY based on the provided study material below.\n\n"
        f"=== MATERIAL ===\n{_truncate(raw_text, 30000)}\n=== END ==="
    )
    chat = _make_chat(system, session_id=session_id)
    return await chat.send_message(UserMessage(text=message))


async def snap_solve(image_base64: str, subject_hint: str = "") -> dict:
    system = (
        "You are a problem-solving tutor. Output ONLY JSON: "
        "{\"problem_extracted\": str, \"solution_steps\": [str], "
        "\"concept_tested\": str, \"similar_questions\": [str]}. "
        "Use LaTeX inside $...$ or $$...$$ for math expressions."
    )
    chat = _make_chat(system)
    if "," in image_base64 and image_base64.startswith("data:"):
        image_base64 = image_base64.split(",", 1)[1]
    img = ImageContent(image_base64=image_base64)
    hint = f" Subject hint: {subject_hint}." if subject_hint else ""
    msg = UserMessage(
        text=f"Identify the problem in this image and solve it step-by-step.{hint} "
        f"Then identify the core concept tested and generate 3 similar practice questions.\n\nOutput JSON only.",
        file_contents=[img],
    )
    return _extract_json(await chat.send_message(msg))


async def mood_response(mood_label: str, note: str, name: str = "") -> str:
    system = (
        "You are a warm, supportive study companion. In 2-3 short sentences, respond to a student's mood "
        "check-in. Be empathetic, never preachy. End with one tiny actionable nudge."
    )
    chat = _make_chat(system)
    name_part = f" (their name is {name})" if name else ""
    note_part = f" They added: \"{note}\"." if note else ""
    msg = UserMessage(text=f"Student mood: {mood_label}.{note_part}{name_part}")
    return await chat.send_message(msg)


async def daily_spark(name: str, subject: str = "") -> str:
    system = "You are an upbeat motivational coach for students. Output ONE energetic 1-2 sentence message."
    chat = _make_chat(system)
    subj = f" who is studying {subject}" if subject else ""
    msg = UserMessage(text=f"Write today's motivational spark for {name or 'a student'}{subj}. Make it specific and warm.")
    return await chat.send_message(msg)


async def burnout_suggestions() -> List[str]:
    system = "Output ONLY JSON array of 3 short, actionable, kind suggestions (each <15 words) for a burned-out student."
    chat = _make_chat(system)
    return _extract_json(await chat.send_message(UserMessage(text="Generate 3 burnout-relief suggestions.")))


async def generate_reels(raw_text: str, n: int = 5) -> List[dict]:
    system = (
        "Output ONLY JSON array. Each reel: "
        "{\"title\": str, \"hook\": str (1 attention sentence), "
        "\"points\": [3-5 short engaging strings], \"analogy\": str (real-life example), "
        "\"takeaway\": str (1 sentence), \"script_text\": str (the full script glued together for sharing)}."
    )
    chat = _make_chat(system)
    msg = UserMessage(
        text=f"Create exactly {n} micro-learning reel scripts from this content. "
        f"Each should explain ONE key concept in TikTok/Reels style: catchy hook, 3-5 punchy points, "
        f"a real-life analogy, and one takeaway. Make them simple, engaging, student-friendly.\n\n"
        f"{_truncate(raw_text, 30000)}\n\nJSON only."
    )
    return _extract_json(await chat.send_message(msg))


async def explain_three_ways(text: str) -> dict:
    system = (
        "Output ONLY JSON: {\"simple\": str (explain like I'm 12, 2-3 sentences), "
        "\"exam\": str (exam-ready precise answer, 3-4 sentences), "
        "\"advanced\": str (deeper expert-level nuance, 4-5 sentences)}."
    )
    chat = _make_chat(system)
    msg = UserMessage(text=f"Explain this in 3 ways:\n\n{text[:6000]}\n\nJSON only.")
    return _extract_json(await chat.send_message(msg))


async def audio_recap(raw_text: str, format_: str, length_minutes: int) -> dict:
    fmt = format_.lower()
    if fmt == "podcast":
        instr = (
            f"Generate a {length_minutes}-minute educational podcast script. Format as a natural conversation "
            f"between Host A (asks questions, plays student role) and Host B (explains concepts clearly, expert). "
            f"Cover ALL key concepts. Engaging transitions. NO stage directions or sound effects."
        )
        speakers = "Each segment: speaker is 'A' or 'B'."
    elif fmt == "lecture":
        instr = (
            f"Generate a {length_minutes}-minute university lecture script. Academic tone, "
            f"clear structure (intro, main sections, conclusion). Single speaker."
        )
        speakers = "Each segment: speaker is 'Professor'."
    elif fmt == "audiobook":
        instr = (
            f"Convert this study material into a {length_minutes}-minute audiobook narration. "
            f"Comprehensive, well-paced, covers all content."
        )
        speakers = "Each segment: speaker is 'Narrator'."
    else:  # summary
        instr = f"Generate a concise {length_minutes}-minute summary. Cover only the most critical concepts. Direct."
        speakers = "Each segment: speaker is 'Narrator'."

    target_words = length_minutes * 130
    system = (
        f"Output ONLY valid JSON: {{\"title\": str, \"segments\": [{{\"speaker\": str, \"text\": str}}]}}. "
        f"{speakers} Aim for ~{target_words} total words across segments. Each segment 2-5 sentences."
    )
    chat = _make_chat(system)
    msg = UserMessage(text=f"{instr}\n\nMaterial:\n{_truncate(raw_text, 30000)}\n\nJSON only.")
    return _extract_json(await chat.send_message(msg))


async def explainer_generate(topic: str, raw_text: str, style: str, length_minutes: int) -> dict:
    style_map = {
        "classic": "Classic Explainer style: best for technical/complex topics, structured slides, formal academic style.",
        "story": "Animated Story style: simple visual storytelling, character-driven narrative.",
        "conversation": "Conversation style: two characters debate/discuss the topic, dialogue format.",
    }
    style_instr = style_map.get(style.lower().split()[0] if style else "classic", style_map["classic"])
    target_words = length_minutes * 120
    n_slides = max(5, length_minutes * 2)

    system = (
        "Output ONLY valid JSON with structure: "
        "{\"title\": str, \"totalSlides\": int, \"slides\": ["
        "{\"slideNumber\": int, \"title\": str, \"content\": [str], \"speakerNote\": str, "
        "\"visualType\": \"text\"|\"diagram\"|\"timeline\"|\"comparison\"|\"list\", "
        "\"svgDiagram\": str|null, \"analogy\": str|null, \"keyTerm\": str|null}], "
        "\"summary\": str}. "
        "Rules for svgDiagram: Only when visualType is 'diagram' or 'timeline'. "
        "viewBox='0 0 400 300'. Use ONLY rect, circle, line, text, path, polygon. "
        "Colors: #4f6ef7, #00c4cc, #f5a623, #ffffff, #1a1a2a. Font size 12-16px. Simple and clean. "
        "NO external images or xlink:href."
    )

    src = topic if topic else _truncate(raw_text, 3000)
    user_msg = (
        f"Generate an educational explainer about: {src}\n"
        f"Style: {style_instr}\n"
        f"Target length: {length_minutes} minutes (~{target_words} words of narration total across ~{n_slides} slides).\n"
        f"Speaker notes should sum to ~{target_words} words.\n\nJSON only."
    )
    chat = _make_chat(system)
    return _extract_json(await chat.send_message(UserMessage(text=user_msg)))
