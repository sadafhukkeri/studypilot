import { useEffect, useRef, useState } from "react";
import AppShell from "@/components/AppShell";
import api from "@/lib/api";
import { PlayCircle, Loader2, ChevronLeft, ChevronRight, Play, Pause, Maximize2, Minimize2, Sparkles, Printer } from "lucide-react";
import { toast } from "sonner";
import { speak, cancelSpeech, pickVoice } from "@/lib/tts";

const STYLES = [
  { key: "classic", label: "Classic Explainer", desc: "Best for technical/complex topics. Structured, formal." },
  { key: "story", label: "Animated Story", desc: "Simple concepts, character-driven storytelling." },
  { key: "conversation", label: "Conversation", desc: "Two characters debate/discuss the topic." },
];

const LENGTHS = [5, 10, 15, 30];

export default function ExplainerPage() {
  const [tab, setTab] = useState("set"); // 'set' | 'topic'
  const [studySets, setStudySets] = useState([]);
  const [studySetId, setStudySetId] = useState("");
  const [topic, setTopic] = useState("");
  const [style, setStyle] = useState("classic");
  const [length, setLength] = useState(10);
  const [busy, setBusy] = useState(false);
  const [explainer, setExplainer] = useState(null);
  const [list, setList] = useState([]);

  const [slideIdx, setSlideIdx] = useState(0);
  const [autoplay, setAutoplay] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const autoTimer = useRef(null);

  useEffect(() => {
    api.get("/study-sets").then(({ data }) => setStudySets(data));
    api.get("/explainer").then(({ data }) => setList(data));
    return () => cancelSpeech();
  }, []);

  const generate = async () => {
    if (tab === "set" && !studySetId) return toast.error("Pick a study set");
    if (tab === "topic" && !topic.trim()) return toast.error("Enter a topic");
    setBusy(true); setExplainer(null); setSlideIdx(0);
    try {
      const { data } = await api.post("/explainer/generate", {
        study_set_id: tab === "set" ? studySetId : undefined,
        topic: tab === "topic" ? topic : "",
        style,
        length_minutes: length,
      });
      setExplainer(data);
      toast.success("Explainer ready!");
      api.get("/explainer").then(({ data }) => setList(data));
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Generation failed");
    } finally { setBusy(false); }
  };

  const slides = explainer?.slides?.slides || [];
  const slide = slides[slideIdx];

  // Speak speakerNote when slide changes
  useEffect(() => {
    cancelSpeech();
    if (!slide) return;
    const t = setTimeout(() => {
      speak(slide.speakerNote || slide.title, { lang: "en-US", rate: 0.95, pitch: 1.0, voice: pickVoice("en-US") });
    }, 400);
    return () => { clearTimeout(t); cancelSpeech(); };
  }, [slideIdx, explainer]);

  // Auto-play
  useEffect(() => {
    if (autoTimer.current) clearTimeout(autoTimer.current);
    if (autoplay && slides.length > 0 && slideIdx + 1 < slides.length) {
      autoTimer.current = setTimeout(() => setSlideIdx((i) => i + 1), 8000);
    }
    return () => clearTimeout(autoTimer.current);
  }, [autoplay, slideIdx, slides.length]);

  const reopen = async (id) => {
    try {
      const { data } = await api.get(`/explainer/${id}`);
      setExplainer({ id: data.id, topic: data.topic, style: data.style, length_minutes: data.length_minutes, slides: data.slides_json });
      setSlideIdx(0);
    } catch {}
  };

  return (
    <AppShell>
      <div className={`p-10 ${fullscreen ? "max-w-full" : "max-w-7xl"}`}>
        {!fullscreen && (
          <div className="mb-8">
            <p className="text-xs uppercase tracking-[0.3em] text-[#4f6ef7] mb-2 flex items-center gap-2"><PlayCircle className="w-3 h-3" /> AI Explainer</p>
            <h1 className="font-heading font-extrabold text-4xl">AI Explainer</h1>
            <p className="text-white/60 mt-2">Turn any topic or your study material into an animated visual explanation with narration.</p>
          </div>
        )}

        <div className={`grid ${fullscreen ? "grid-cols-1" : "grid-cols-12"} gap-6`}>
          {/* Controls */}
          {!fullscreen && (
            <div className="col-span-5 bg-[#111118] border border-white/5 rounded-2xl p-6">
              <div className="flex border-b border-white/10 mb-5">
                <button onClick={() => setTab("set")} data-testid="tab-set" className={`relative px-4 py-2.5 text-sm font-medium ${tab === "set" ? "text-white" : "text-white/50"}`}>
                  From Study Set {tab === "set" && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#4f6ef7]" />}
                </button>
                <button onClick={() => setTab("topic")} data-testid="tab-topic" className={`relative px-4 py-2.5 text-sm font-medium ${tab === "topic" ? "text-white" : "text-white/50"}`}>
                  From Topic {tab === "topic" && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#4f6ef7]" />}
                </button>
              </div>

              {tab === "set" ? (
                <select value={studySetId} onChange={(e) => setStudySetId(e.target.value)} data-testid="explainer-set-select" className="w-full px-4 py-3 rounded-xl bg-[#1a1a2a] border border-white/10 text-white focus:border-[#4f6ef7] focus:outline-none mb-5">
                  <option value="">Select study set...</option>
                  {studySets.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
                </select>
              ) : (
                <input value={topic} onChange={(e) => setTopic(e.target.value)} data-testid="explainer-topic" placeholder="Enter any topic... e.g. Photosynthesis, World War 2" className="w-full px-4 py-3 rounded-xl bg-[#1a1a2a] border border-white/10 text-white placeholder:text-white/30 focus:border-[#4f6ef7] focus:outline-none mb-5" />
              )}

              <p className="text-xs uppercase tracking-widest text-white/50 mb-3">Style</p>
              <div className="space-y-2 mb-5">
                {STYLES.map((s) => (
                  <button
                    key={s.key}
                    onClick={() => setStyle(s.key)}
                    data-testid={`style-${s.key}`}
                    className={`w-full text-left p-4 rounded-xl border transition ${style === s.key ? "bg-[#4f6ef7]/15 border-[#4f6ef7]/50 shadow-[0_0_20px_rgba(79,110,247,0.2)]" : "bg-[#1a1a2a] border-white/10 hover:border-white/30"}`}
                  >
                    <h3 className="font-heading font-bold text-sm mb-1">{s.label}</h3>
                    <p className="text-white/55 text-xs">{s.desc}</p>
                  </button>
                ))}
              </div>

              <p className="text-xs uppercase tracking-widest text-white/50 mb-3">Length</p>
              <div className="flex gap-2 mb-6">
                {LENGTHS.map((m) => (
                  <button
                    key={m}
                    onClick={() => setLength(m)}
                    data-testid={`exp-length-${m}`}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${length === m ? "bg-[#4f6ef7] text-white" : "bg-[#1a1a2a] text-white/60 hover:text-white"}`}
                  >
                    {m} min
                  </button>
                ))}
              </div>

              <button
                onClick={generate}
                disabled={busy}
                data-testid="generate-explainer-btn"
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#4f6ef7] to-[#00c4cc] text-white font-medium hover:shadow-[0_0_30px_rgba(79,110,247,0.5)] disabled:opacity-50 transition flex items-center justify-center gap-2"
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {busy ? "Generating..." : "Generate Explainer"}
              </button>
            </div>
          )}

          {/* Viewer */}
          <div className={fullscreen ? "col-span-1" : "col-span-7"}>
            {!explainer ? (
              <div className="bg-[#111118] border border-white/5 rounded-2xl p-16 text-center min-h-[500px] flex flex-col items-center justify-center">
                <PlayCircle className="w-12 h-12 text-white/20 mb-4" />
                <p className="text-white/50">Generate an explainer to see slides here.</p>
              </div>
            ) : (
              <SlideViewer
                slide={slide}
                slideIdx={slideIdx}
                total={slides.length}
                title={explainer.slides?.title || explainer.topic}
                fullscreen={fullscreen}
                autoplay={autoplay}
                onPrev={() => setSlideIdx((i) => Math.max(0, i - 1))}
                onNext={() => setSlideIdx((i) => Math.min(slides.length - 1, i + 1))}
                onAutoplay={() => setAutoplay((v) => !v)}
                onFullscreen={() => setFullscreen((v) => !v)}
                onPrint={() => window.print()}
              />
            )}
          </div>
        </div>

        {/* Gallery */}
        {!fullscreen && list.length > 0 && (
          <div className="mt-12">
            <h2 className="font-heading font-bold text-xl mb-4">My Explainers</h2>
            <div className="grid grid-cols-3 gap-4" data-testid="explainer-gallery">
              {list.map((e) => (
                <button
                  key={e.id}
                  onClick={() => reopen(e.id)}
                  data-testid={`gallery-${e.id}`}
                  className="text-left bg-[#111118] border border-white/5 rounded-2xl p-5 hover:border-[#4f6ef7]/40 hover:shadow-[0_0_24px_rgba(79,110,247,0.15)] transition-all"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="px-2 py-0.5 rounded-full bg-[#4f6ef7]/15 text-[#4f6ef7] text-xs capitalize">{e.style}</span>
                    <span className="text-white/40 text-xs">{e.length_minutes}min</span>
                  </div>
                  <h3 className="font-heading font-semibold text-base mb-1 truncate">{e.topic}</h3>
                  <p className="text-white/40 text-xs">{new Date(e.created_at).toLocaleDateString()}</p>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

function SlideViewer({ slide, slideIdx, total, title, fullscreen, autoplay, onPrev, onNext, onAutoplay, onFullscreen, onPrint }) {
  const [titleTyped, setTitleTyped] = useState("");
  const [contentShown, setContentShown] = useState(0);

  useEffect(() => {
    if (!slide) return;
    setTitleTyped("");
    setContentShown(0);
    const t = slide.title || "";
    let i = 0;
    const typer = setInterval(() => {
      i++;
      setTitleTyped(t.slice(0, i));
      if (i >= t.length) clearInterval(typer);
    }, 40);
    const timers = [];
    (slide.content || []).forEach((_, k) => {
      timers.push(setTimeout(() => setContentShown((p) => Math.max(p, k + 1)), 300 * (k + 1) + t.length * 40));
    });
    return () => { clearInterval(typer); timers.forEach(clearTimeout); };
  }, [slide]);

  if (!slide) return null;

  return (
    <div className={`bg-[#111118] border border-white/5 rounded-2xl overflow-hidden ${fullscreen ? "min-h-[80vh]" : ""}`} data-testid="slide-viewer">
      <div className="px-6 py-3 border-b border-white/5 flex items-center justify-between bg-[#1a1a2a]/40">
        <p className="text-xs text-white/50 truncate max-w-[60%]">{title}</p>
        <div className="flex items-center gap-2">
          <button onClick={onAutoplay} data-testid="autoplay-toggle" className={`p-2 rounded-lg transition ${autoplay ? "bg-[#4f6ef7] text-white" : "hover:bg-white/5 text-white/60"}`}>
            {autoplay ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>
          <button onClick={onPrint} data-testid="print-btn" className="p-2 rounded-lg hover:bg-white/5 text-white/60 transition"><Printer className="w-4 h-4" /></button>
          <button onClick={onFullscreen} data-testid="fullscreen-toggle" className="p-2 rounded-lg hover:bg-white/5 text-white/60 transition">
            {fullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <div className="p-10 slide-enter" key={slideIdx}>
        <p className="text-xs uppercase tracking-[0.3em] text-[#00c4cc] mb-3">Slide {slideIdx + 1}</p>
        <h2 className="font-heading font-extrabold text-3xl mb-6 leading-tight" data-testid="slide-title">
          {titleTyped}<span className="opacity-50 animate-pulse">{titleTyped.length < (slide.title || "").length ? "▎" : ""}</span>
        </h2>

        {slide.keyTerm && (
          <span className="inline-block px-3 py-1 mb-4 rounded-full bg-[#4f6ef7] text-white text-xs font-semibold">{slide.keyTerm}</span>
        )}

        {(slide.visualType === "diagram" || slide.visualType === "timeline") && slide.svgDiagram && (
          <div className="bg-[#1a1a2a] rounded-xl p-4 mb-5" dangerouslySetInnerHTML={{ __html: slide.svgDiagram }} />
        )}

        <ul className="space-y-3 mb-5">
          {(slide.content || []).map((c, i) => (
            <li
              key={i}
              className="flex items-start gap-3 text-white/90 leading-relaxed transition-all duration-500"
              style={{ opacity: i < contentShown ? 1 : 0, transform: i < contentShown ? "translateY(0)" : "translateY(8px)" }}
            >
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#4f6ef7]/20 border border-[#4f6ef7]/40 text-[#4f6ef7] text-xs flex items-center justify-center font-bold">{i + 1}</span>
              {c}
            </li>
          ))}
        </ul>

        {slide.analogy && (
          <div className="bg-[#f5a623]/10 border-2 border-[#f5a623] rounded-xl p-4 mb-5">
            <p className="text-xs uppercase tracking-[0.3em] text-[#f5a623] mb-1">Analogy</p>
            <p className="text-white/90 italic text-sm leading-relaxed">{slide.analogy}</p>
          </div>
        )}
      </div>

      <div className="px-6 py-4 border-t border-white/5 flex items-center justify-between">
        <button onClick={onPrev} disabled={slideIdx === 0} data-testid="slide-prev" className="px-4 py-2 rounded-lg bg-[#1a1a2a] hover:bg-[#1a1a2a]/80 disabled:opacity-30 transition flex items-center gap-2 text-sm">
          <ChevronLeft className="w-4 h-4" /> Previous
        </button>
        <p className="text-white/50 text-sm font-mono">{slideIdx + 1} / {total}</p>
        <button onClick={onNext} disabled={slideIdx + 1 >= total} data-testid="slide-next" className="px-4 py-2 rounded-lg bg-[#4f6ef7] text-white disabled:opacity-30 transition flex items-center gap-2 text-sm">
          Next <ChevronRight className="w-4 h-4" />
        </button>
      </div>
      <style>{`@keyframes slide-enter { from { opacity: 0; transform: translateX(40px); } to { opacity: 1; transform: translateX(0); } } .slide-enter { animation: slide-enter 0.4s ease-out; }`}</style>
    </div>
  );
}
