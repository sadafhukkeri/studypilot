import { useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import AppShell from "@/components/AppShell";
import api from "@/lib/api";
import { ArrowLeft, Headphones, Mic2, BookOpen, FileText, Loader2, Play, Pause, Download, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { speak, cancelSpeech, pickVoiceBy, VOICE_MAP, cleanTextForTTS } from "@/lib/tts";

const FORMATS = [
  { key: "podcast", label: "Podcast", desc: "Two-host conversational dialogue", icon: Mic2, color: "#4f6ef7" },
  { key: "lecture", label: "Lecture", desc: "Single professor, formal academic", icon: BookOpen, color: "#00c4cc" },
  { key: "audiobook", label: "Audiobook", desc: "Narration-driven, full coverage", icon: Headphones, color: "#f5a623" },
  { key: "summary", label: "Summary", desc: "Short crisp overview, key points", icon: FileText, color: "#e94560" },
];
const LENGTHS = [3, 6, 12, 24, 30, 45];
const VOICES = ["Neutral", "Male-Deep", "Female-Warm", "British-Male", "British-Female", "Indian-Female", "Indian-Male"];
const SPEEDS = [0.75, 1, 1.25, 1.5, 2];

export default function AudioRecapPage() {
  const { id } = useParams();
  const [setTitle, setSetTitle] = useState("");
  const [format, setFormat] = useState("podcast");
  const [length, setLength] = useState(6);
  const [voiceA, setVoiceA] = useState("Neutral");
  const [voiceB, setVoiceB] = useState("Female-Warm");
  const [busy, setBusy] = useState(false);
  const [recap, setRecap] = useState(null);

  // Player state
  const [playing, setPlaying] = useState(false);
  const [segIdx, setSegIdx] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [showTranscript, setShowTranscript] = useState(false);
  const utteranceRef = useRef(null);

  useEffect(() => {
    api.get(`/study-sets/${id}`).then(({ data }) => setSetTitle(data.title)).catch(() => {});
    return () => cancelSpeech();
  }, [id]);

  const generate = async () => {
    setBusy(true); setRecap(null); setSegIdx(0); setPlaying(false);
    try {
      const { data } = await api.post("/audio-recap/generate", {
        study_set_id: id, format, length_minutes: length, voice_a: voiceA, voice_b: voiceB,
      });
      setRecap(data);
      toast.success("Audio recap ready!");
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Generation failed");
    } finally { setBusy(false); }
  };

  const speakSegment = (i) => {
    if (!recap?.script?.segments?.[i]) {
      setPlaying(false);
      return;
    }
    const seg = recap.script.segments[i];
    let voiceName = voiceA;
    if (format === "podcast") {
      voiceName = seg.speaker === "B" ? voiceB : voiceA;
    }
    const cfg = VOICE_MAP[voiceName] || VOICE_MAP["Neutral"];
    cancelSpeech();
    utteranceRef.current = speak(seg.text, {
      lang: cfg.langCode,
      rate: 0.95 * speed,
      pitch: 1.0,
      voice: pickVoiceBy(cfg),
      onend: () => {
        if (i + 1 < recap.script.segments.length) {
          setSegIdx(i + 1);
          setTimeout(() => speakSegment(i + 1), 100);
        } else {
          setPlaying(false);
        }
      },
    });
  };

  const playPause = () => {
    if (!recap) return;
    if (playing) {
      cancelSpeech();
      setPlaying(false);
    } else {
      setPlaying(true);
      speakSegment(segIdx);
    }
  };

  // Download as audio: use MediaRecorder on a destination — but Web Speech API has no audio stream.
  // Fallback: download the script as a .txt file for now (MediaRecorder of speech requires Audio API tap).
  const downloadScript = () => {
    if (!recap) return;
    const text = recap.script.segments.map((s) => `${s.speaker}: ${cleanTextForTTS(s.text)}`).join("\n\n");
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${setTitle || "recap"}-${format}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AppShell>
      <div className="p-10 max-w-6xl">
        <Link to={`/study-set/${id}`} className="inline-flex items-center gap-2 text-white/60 hover:text-white mb-6 text-sm">
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>
        <div className="mb-10">
          <p className="text-xs uppercase tracking-[0.3em] text-[#00c4cc] mb-2 flex items-center gap-2">
            <Headphones className="w-3 h-3" /> Audio Recap
          </p>
          <h1 className="font-heading font-extrabold text-4xl">{setTitle}</h1>
          <p className="text-white/60 mt-2">Turn your notes into a podcast, lecture, or audiobook.</p>
        </div>

        {/* Step 1: Format */}
        <div className="mb-8">
          <p className="text-xs uppercase tracking-widest text-white/50 mb-3">1. Format</p>
          <div className="grid grid-cols-4 gap-4">
            {FORMATS.map((f) => (
              <button
                key={f.key}
                onClick={() => setFormat(f.key)}
                data-testid={`format-${f.key}`}
                className={`p-5 rounded-2xl text-left transition-all ${format === f.key ? "bg-white/5 border-2 shadow-[0_0_30px_rgba(79,110,247,0.2)]" : "bg-[#111118] border border-white/5 hover:border-white/20"}`}
                style={format === f.key ? { borderColor: f.color, boxShadow: `0 0 30px ${f.color}33` } : {}}
              >
                <f.icon className="w-6 h-6 mb-3" style={{ color: f.color }} />
                <h3 className="font-heading font-bold text-base mb-1">{f.label}</h3>
                <p className="text-white/55 text-xs leading-relaxed">{f.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Step 2: Length */}
        <div className="mb-8">
          <p className="text-xs uppercase tracking-widest text-white/50 mb-3">2. Length</p>
          <div className="inline-flex bg-[#1a1a2a] border border-white/10 rounded-xl p-1 flex-wrap">
            {LENGTHS.map((m) => (
              <button
                key={m}
                onClick={() => setLength(m)}
                data-testid={`length-${m}`}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${length === m ? "bg-[#4f6ef7] text-white" : "text-white/60 hover:text-white"}`}
              >
                {m === 3 ? "Short" : m === 6 ? "Medium" : m === 12 ? "Long" : m === 24 ? "Extended" : m === 30 ? "Complete" : "Ultra"} ({m}m)
              </button>
            ))}
          </div>
        </div>

        {/* Step 3: Voice */}
        <div className="mb-8">
          <p className="text-xs uppercase tracking-widest text-white/50 mb-3">3. Voice</p>
          {format === "podcast" ? (
            <div className="grid grid-cols-2 gap-4 max-w-md">
              <div>
                <label className="text-white/70 text-xs mb-1 block">Voice A (Host)</label>
                <select value={voiceA} onChange={(e) => setVoiceA(e.target.value)} data-testid="voice-a" className="w-full px-4 py-2.5 rounded-xl bg-[#1a1a2a] border border-white/10 text-white focus:border-[#4f6ef7] focus:outline-none">
                  {VOICES.map((v) => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="text-white/70 text-xs mb-1 block">Voice B (Expert)</label>
                <select value={voiceB} onChange={(e) => setVoiceB(e.target.value)} data-testid="voice-b" className="w-full px-4 py-2.5 rounded-xl bg-[#1a1a2a] border border-white/10 text-white focus:border-[#4f6ef7] focus:outline-none">
                  {VOICES.map((v) => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
            </div>
          ) : (
            <select value={voiceA} onChange={(e) => setVoiceA(e.target.value)} data-testid="voice-a" className="px-4 py-2.5 rounded-xl bg-[#1a1a2a] border border-white/10 text-white focus:border-[#4f6ef7] focus:outline-none">
              {VOICES.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          )}
        </div>

        {/* Generate */}
        <button
          onClick={generate}
          disabled={busy}
          data-testid="generate-recap-btn"
          className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-[#4f6ef7] to-[#00c4cc] text-white font-medium hover:shadow-[0_0_30px_rgba(79,110,247,0.5)] disabled:opacity-50 transition inline-flex items-center gap-2 mb-10"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          {busy ? "StudyPilot is generating your audio recap..." : "Generate Audio Recap"}
        </button>

        {busy && (
          <div className="bg-[#111118] border border-white/5 rounded-2xl p-6 mb-6 flex items-center gap-4">
            <SoundWave />
            <p className="text-white/70 text-sm">Crafting {length}-minute {format} from your study set...</p>
          </div>
        )}

        {/* Player */}
        {recap && (
          <div className="bg-[#111118] border border-white/5 rounded-2xl p-6" data-testid="audio-player">
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="text-xs uppercase tracking-widest text-[#00c4cc] mb-1">{recap.format}</p>
                <h3 className="font-heading font-bold text-xl">{recap.script?.title || "Audio Recap"}</h3>
              </div>
              <button onClick={downloadScript} data-testid="download-recap-btn" className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition flex items-center gap-2 text-sm">
                <Download className="w-4 h-4" /> Script
              </button>
            </div>

            <div className="flex items-center gap-4 mb-5">
              <button onClick={playPause} data-testid="play-pause-btn" className="w-14 h-14 rounded-full bg-gradient-to-br from-[#4f6ef7] to-[#00c4cc] flex items-center justify-center hover:scale-105 transition">
                {playing ? <Pause className="w-6 h-6 text-white" /> : <Play className="w-6 h-6 text-white ml-0.5" />}
              </button>
              <div className="flex-1">
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-[#4f6ef7] to-[#00c4cc] transition-all" style={{ width: `${((segIdx + (playing ? 0.5 : 0)) / Math.max(recap.script?.segments?.length || 1, 1)) * 100}%` }} />
                </div>
                <div className="flex justify-between text-white/40 text-xs mt-1.5 font-mono">
                  <span>Seg {segIdx + 1} / {recap.script?.segments?.length || 0}</span>
                  <span>~{recap.length_minutes} min</span>
                </div>
              </div>
            </div>

            {/* Speed pills */}
            <div className="flex items-center gap-2 mb-5">
              <span className="text-white/50 text-xs">Speed:</span>
              {SPEEDS.map((s) => (
                <button
                  key={s}
                  onClick={() => setSpeed(s)}
                  data-testid={`speed-${s}`}
                  className={`px-3 py-1 rounded-lg text-xs font-mono ${speed === s ? "bg-[#4f6ef7] text-white" : "bg-[#1a1a2a] text-white/60 hover:text-white"}`}
                >
                  {s}x
                </button>
              ))}
            </div>

            <button onClick={() => setShowTranscript((v) => !v)} className="text-sm text-[#00c4cc] hover:underline" data-testid="toggle-transcript">
              {showTranscript ? "Hide" : "Show"} transcript
            </button>

            {showTranscript && (
              <div className="mt-5 max-h-96 overflow-y-auto bg-[#1a1a2a] rounded-xl p-5 space-y-3" data-testid="transcript">
                {(recap.script?.segments || []).map((seg, i) => (
                  <div key={i} className={`p-3 rounded-lg transition ${i === segIdx ? "bg-[#4f6ef7]/15 border border-[#4f6ef7]/30" : "border border-transparent"}`}>
                    <p className="text-xs text-[#00c4cc] uppercase tracking-widest mb-1">{seg.speaker}</p>
                    <p className="text-white/85 text-sm leading-relaxed">{seg.text}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}

function SoundWave() {
  return (
    <div className="flex items-center gap-1 h-10">
      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
        <div
          key={i}
          className="w-1.5 rounded-full bg-gradient-to-t from-[#4f6ef7] to-[#00c4cc]"
          style={{
            height: `${30 + Math.sin(i) * 20}%`,
            animation: `wave 1s ease-in-out ${i * 0.1}s infinite alternate`,
          }}
        />
      ))}
      <style>{`@keyframes wave { from { height: 20%; } to { height: 100%; } }`}</style>
    </div>
  );
}
