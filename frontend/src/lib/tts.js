// Global TTS utility — strips markdown/emojis before SpeechSynthesis.speak()
export function cleanTextForTTS(text) {
  if (!text) return "";
  return String(text)
    .replace(/\*\*\*(.*?)\*\*\*/g, "$1")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/#{1,6}\s/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/`{1,3}[^`]*`{1,3}/g, "")
    .replace(/[\u{1F600}-\u{1F64F}]/gu, "")
    .replace(/[\u{1F300}-\u{1F5FF}]/gu, "")
    .replace(/[\u{1F680}-\u{1F6FF}]/gu, "")
    .replace(/[\u{1F1E0}-\u{1F1FF}]/gu, "")
    .replace(/[\u{2600}-\u{26FF}]/gu, "")
    .replace(/[\u{2700}-\u{27BF}]/gu, "")
    .replace(/[•·–—]/g, "")
    .replace(/__(.*?)__/g, "$1")
    .replace(/_(.*?)_/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

// Pick best matching voice for a BCP-47 lang code
export function pickVoice(langCode) {
  if (typeof window === "undefined" || !window.speechSynthesis) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices?.length) return null;
  return (
    voices.find((v) => v.lang === langCode) ||
    voices.find((v) => v.lang?.startsWith(langCode.split("-")[0])) ||
    voices[0]
  );
}

// Pick voice by gender hint + locale
export function pickVoiceBy({ langCode = "en-US", gender = "neutral" } = {}) {
  if (typeof window === "undefined" || !window.speechSynthesis) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices?.length) return null;
  const localeMatches = voices.filter((v) => v.lang === langCode);
  const partialMatches = voices.filter((v) => v.lang?.startsWith(langCode.split("-")[0]));
  const pool = localeMatches.length ? localeMatches : partialMatches.length ? partialMatches : voices;

  const lower = (s) => (s || "").toLowerCase();
  if (gender === "male") {
    const m = pool.find((v) => /male|david|alex|fred|daniel|aaron|arjun|ravi/.test(lower(v.name)) && !/female/.test(lower(v.name)));
    if (m) return m;
  }
  if (gender === "female") {
    const f = pool.find((v) => /female|samantha|victoria|karen|aditi|kalpana|priya|kavya/.test(lower(v.name)));
    if (f) return f;
  }
  return pool[0];
}

// Speak text safely — cleans + sets language + voice + rate/pitch
export function speak(text, opts = {}) {
  if (typeof window === "undefined" || !window.speechSynthesis) return null;
  const cleaned = cleanTextForTTS(text);
  if (!cleaned) return null;
  const u = new SpeechSynthesisUtterance(cleaned);
  u.lang = opts.lang || "en-US";
  u.rate = opts.rate ?? 0.95;
  u.pitch = opts.pitch ?? 1.0;
  const voice = opts.voice || pickVoice(u.lang);
  if (voice) u.voice = voice;
  if (opts.onend) u.onend = opts.onend;
  if (opts.onstart) u.onstart = opts.onstart;
  if (opts.onerror) u.onerror = opts.onerror;
  window.speechSynthesis.speak(u);
  return u;
}

export function cancelSpeech() {
  if (typeof window !== "undefined" && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}

// Map a friendly voice name → { langCode, gender }
export const VOICE_MAP = {
  "Neutral": { langCode: "en-US", gender: "neutral" },
  "Male-Deep": { langCode: "en-US", gender: "male" },
  "Female-Warm": { langCode: "en-US", gender: "female" },
  "British-Male": { langCode: "en-GB", gender: "male" },
  "British-Female": { langCode: "en-GB", gender: "female" },
  "Indian-Female": { langCode: "en-IN", gender: "female" },
  "Indian-Male": { langCode: "en-IN", gender: "male" },
};
