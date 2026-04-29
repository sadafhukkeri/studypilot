import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import AppShell from "@/components/AppShell";
import api from "@/lib/api";
import { Mic, MicOff, Loader2, Volume2 } from "lucide-react";
import { toast } from "sonner";
import { speak, cancelSpeech, pickVoice } from "@/lib/tts";

const LANGUAGES = [
  { code: "auto", label: "Auto-detect", bcp: "en-IN" },
  { code: "en", label: "English", bcp: "en-IN" },
  { code: "hi", label: "हिन्दी (Hindi)", bcp: "hi-IN" },
  { code: "ta", label: "தமிழ் (Tamil)", bcp: "ta-IN" },
  { code: "te", label: "తెలుగు (Telugu)", bcp: "te-IN" },
  { code: "mr", label: "मराठी (Marathi)", bcp: "mr-IN" },
  { code: "bn", label: "বাংলা (Bengali)", bcp: "bn-IN" },
  { code: "gu", label: "ગુજરાતી (Gujarati)", bcp: "gu-IN" },
];

export default function VoiceTutorPage() {
  const [lang, setLang] = useState("auto");
  const [studySets, setStudySets] = useState([]);
  const [activeSet, setActiveSet] = useState("");
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState([]);
  const [interim, setInterim] = useState("");
  const [sessionId] = useState(() => `voice_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`);
  const recogRef = useRef(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    api.get("/study-sets").then(({ data }) => {
      setStudySets(data);
      if (data.length > 0) setActiveSet(data[0].id);
    });
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, interim]);

  const supported = typeof window !== "undefined" && (window.SpeechRecognition || window.webkitSpeechRecognition);

  const start = () => {
    if (!supported) return toast.error("Speech recognition not supported in this browser");
    if (!activeSet) return toast.error("Pick a study set first");
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const r = new SR();
    const langObj = LANGUAGES.find((l) => l.code === lang) || LANGUAGES[1];
    r.lang = langObj.bcp;
    r.interimResults = true;
    r.continuous = false;
    r.onresult = (e) => {
      let final = "";
      let inter = "";
      for (let i = 0; i < e.results.length; i++) {
        const txt = e.results[i][0].transcript;
        if (e.results[i].isFinal) final += txt;
        else inter += txt;
      }
      setInterim(inter);
      if (final) {
        setInterim("");
        sendQuery(final.trim(), langObj);
      }
    };
    r.onerror = (e) => {
      console.warn("SR err", e);
      setRecording(false);
    };
    r.onend = () => setRecording(false);
    recogRef.current = r;
    r.start();
    setRecording(true);
  };

  const stop = () => {
    recogRef.current?.stop();
    setRecording(false);
  };

  const sendQuery = async (text, langObj) => {
    setMessages((m) => [...m, { role: "user", message: text }]);
    setBusy(true);
    try {
      const { data } = await api.post("/studypilotai/voice", {
        study_set_id: activeSet,
        transcript_user: text,
        language: langObj.label.split(" (")[0],
        session_id: sessionId,
      });
      setMessages((m) => [...m, { role: "assistant", message: data.response_text }]);
      // Speak it
      if (window.speechSynthesis) {
        const u = new SpeechSynthesisUtterance(data.response_text);
        u.lang = langObj.bcp;
        u.rate = 1;
        window.speechSynthesis.speak(u);
      }
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Voice request failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell>
      <div className="p-10 max-w-5xl mx-auto">
        <div className="mb-8">
          <p className="text-xs uppercase tracking-[0.3em] text-[#00c4cc] mb-2">Voice Tutor</p>
          <h1 className="font-heading font-extrabold text-4xl">Talk to StudyPilot AI</h1>
          <p className="text-white/60 mt-2">Speak naturally in 7 languages. Built for Indian students.</p>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3 mb-8 flex-wrap">
          <select
            value={activeSet}
            onChange={(e) => setActiveSet(e.target.value)}
            data-testid="voice-set-select"
            className="px-4 py-2.5 rounded-xl bg-[#1a1a2a] border border-white/10 text-white focus:border-[#4f6ef7] focus:outline-none"
          >
            <option value="">Select study set...</option>
            {studySets.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
          </select>
          <select
            value={lang}
            onChange={(e) => setLang(e.target.value)}
            data-testid="voice-lang-select"
            className="px-4 py-2.5 rounded-xl bg-[#1a1a2a] border border-white/10 text-white focus:border-[#4f6ef7] focus:outline-none"
          >
            {LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
          </select>
        </div>

        {/* Mic */}
        <div className="bg-[#111118]/60 backdrop-blur-xl border border-white/10 rounded-3xl p-12 mb-8 text-center">
          <button
            onClick={recording ? stop : start}
            disabled={busy}
            data-testid="mic-btn"
            className={`relative w-32 h-32 rounded-full flex items-center justify-center mx-auto transition-all duration-300 disabled:opacity-50 ${
              recording
                ? "bg-red-500 shadow-[0_0_60px_rgba(239,68,68,0.6)] animate-pulse"
                : "bg-gradient-to-br from-[#4f6ef7] to-[#00c4cc] hover:shadow-[0_0_60px_rgba(79,110,247,0.6)] hover:scale-110"
            }`}
          >
            {recording ? <MicOff className="w-12 h-12 text-white" /> : <Mic className="w-12 h-12 text-white" />}
            {recording && <span className="absolute -inset-2 rounded-full border-2 border-red-400/40 animate-ping" />}
          </button>
          <p className="text-white/70 mt-6 font-medium">
            {recording ? "Listening... click to stop" : busy ? "Thinking..." : "Click to ask"}
          </p>
          {interim && <p className="text-white/40 mt-3 text-sm italic" data-testid="interim-text">"{interim}"</p>}
          {!supported && <p className="text-red-400 text-sm mt-3">Use Chrome or Edge for voice input</p>}
        </div>

        {/* Transcript */}
        <div ref={scrollRef} className="bg-[#111118] border border-white/5 rounded-2xl p-6 max-h-[400px] overflow-y-auto" data-testid="voice-transcript">
          {messages.length === 0 ? (
            <p className="text-white/40 text-center py-8">Your conversation will appear here.</p>
          ) : (
            <div className="space-y-4">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[80%] px-4 py-3 rounded-2xl ${m.role === "user" ? "bg-[#4f6ef7] text-white" : "bg-[#1a1a2a] border border-white/10 text-white/90"}`}>
                    <p className="leading-relaxed">{m.message}</p>
                    {m.role === "assistant" && (
                      <button
                        onClick={() => {
                          const lc = (LANGUAGES.find((l) => l.code === lang) || LANGUAGES[1]).bcp;
                          cancelSpeech();
                          speak(m.message, { lang: lc, rate: 0.9, pitch: 1.0, voice: pickVoice(lc) });
                        }}
                        className="mt-2 inline-flex items-center gap-1 text-xs text-[#00c4cc] hover:underline"
                      >
                        <Volume2 className="w-3 h-3" /> Replay
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {busy && (
                <div className="flex justify-start">
                  <div className="px-4 py-3 rounded-2xl bg-[#1a1a2a] border border-white/10 text-white/60 text-sm flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" /> StudyPilot AI is thinking...
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
