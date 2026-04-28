import { useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import AppShell from "@/components/AppShell";
import api from "@/lib/api";
import { Send, MessageCircle, Image as ImageIcon, FileText, ArrowLeft, Loader2, Plus, Sparkles } from "lucide-react";
import { toast } from "sonner";

const MASCOT_IMG = "https://static.prod-images.emergentagent.com/jobs/08888170-6c2f-493c-8280-6dacc6606bf6/images/60ac151ee6a23e8e0074f7a4d36e0c2c2734542576ebf15ba7bf57040a877979.png";

const LANGUAGES = ["English", "Spanish", "French", "German", "Italian", "Portuguese", "Dutch", "Russian", "Chinese", "Japanese", "Korean", "Arabic", "Hindi", "Turkish", "Polish", "Swedish", "Greek", "Hebrew", "Vietnamese", "Indonesian"];

const TABS = [
  { key: "chat", label: "Chat", icon: MessageCircle },
  { key: "image", label: "Image Analyser", icon: ImageIcon },
  { key: "essay", label: "Essay Grader", icon: FileText },
];

export default function SparkChatPage() {
  const { id } = useParams();
  const [tab, setTab] = useState("chat");
  const [studySet, setStudySet] = useState(null);
  const [studySets, setStudySets] = useState([]);
  const [activeSetId, setActiveSetId] = useState(id || "");
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [sessionId, setSessionId] = useState(() => `chat_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`);
  const [model, setModel] = useState("standard");
  const [language, setLanguage] = useState("English");
  const [imageBase64, setImageBase64] = useState("");
  const [imageReply, setImageReply] = useState("");
  const [essay, setEssay] = useState("");
  const [essayResult, setEssayResult] = useState(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    api.get("/study-sets").then(({ data }) => {
      setStudySets(data);
      if (!activeSetId && data.length > 0) setActiveSetId(data[0].id);
    });
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    if (activeSetId) {
      api.get(`/study-sets/${activeSetId}`).then(({ data }) => setStudySet(data));
    }
  }, [activeSetId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    if (!input.trim() || !activeSetId) return;
    const userMsg = { role: "user", message: input };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setBusy(true);
    try {
      const { data } = await api.post("/sparke/chat", {
        study_set_id: activeSetId,
        message: userMsg.message,
        session_id: sessionId,
        model_mode: model,
        language,
      });
      setMessages((m) => [...m, { role: "assistant", message: data.reply }]);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Chat failed");
    } finally {
      setBusy(false);
    }
  };

  const newChat = () => {
    setMessages([]);
    setSessionId(`chat_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`);
  };

  const onImagePick = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      setImageBase64(result.split(",")[1]);
    };
    reader.readAsDataURL(f);
  };

  const analyseImage = async () => {
    if (!imageBase64) return toast.error("Pick an image first");
    setBusy(true); setImageReply("");
    try {
      const { data } = await api.post("/sparke/image", {
        study_set_id: activeSetId || null,
        image_base64: imageBase64,
        prompt: "Explain what this image/diagram shows in detail for a student.",
      });
      setImageReply(data.explanation);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed");
    } finally {
      setBusy(false);
    }
  };

  const grade = async () => {
    if (essay.trim().length < 50) return toast.error("Essay too short (50+ chars)");
    setBusy(true); setEssayResult(null);
    try {
      const { data } = await api.post("/essay/grade", { essay });
      setEssayResult(data);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell>
      <div className="p-8 max-w-6xl">
        {id && (
          <Link to={`/study-set/${id}`} className="inline-flex items-center gap-2 text-white/60 hover:text-white mb-4 text-sm">
            <ArrowLeft className="w-4 h-4" /> Back to study set
          </Link>
        )}
        <div className="flex items-center gap-3 mb-2">
          <img src={MASCOT_IMG} alt="Spark.E" className="w-12 h-12" />
          <div>
            <h1 className="font-heading font-extrabold text-3xl">Spark.E</h1>
            <p className="text-white/60 text-sm">Your AI tutor that knows your study material</p>
          </div>
        </div>

        {/* Controls bar */}
        <div className="flex items-center gap-3 mt-6 mb-5 flex-wrap">
          <select
            value={activeSetId}
            onChange={(e) => setActiveSetId(e.target.value)}
            data-testid="set-selector"
            className="px-4 py-2 rounded-xl bg-[#1a1a2a] border border-white/10 text-white text-sm focus:border-[#4f6ef7] focus:outline-none"
          >
            <option value="">Select study set...</option>
            {studySets.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
          </select>
          <div className="inline-flex bg-[#1a1a2a] border border-white/10 rounded-xl p-1" data-testid="model-toggle">
            <button onClick={() => setModel("standard")} className={`px-3 py-1.5 rounded-lg text-xs ${model === "standard" ? "bg-[#4f6ef7] text-white" : "text-white/60"}`} data-testid="model-standard">Standard</button>
            <button onClick={() => setModel("ultra")} className={`px-3 py-1.5 rounded-lg text-xs ${model === "ultra" ? "bg-[#4f6ef7] text-white" : "text-white/60"}`} data-testid="model-ultra">Ultra Thinking</button>
          </div>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            data-testid="lang-select"
            className="px-3 py-2 rounded-xl bg-[#1a1a2a] border border-white/10 text-white text-sm"
          >
            {LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
          <button onClick={newChat} data-testid="new-chat-btn" className="ml-auto px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white text-sm flex items-center gap-2">
            <Plus className="w-3.5 h-3.5" /> New Chat
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/10 mb-6">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              data-testid={`tab-${t.key}`}
              className={`relative px-5 py-3 text-sm font-medium flex items-center gap-2 transition ${tab === t.key ? "text-white" : "text-white/50 hover:text-white/80"}`}
            >
              <t.icon className="w-4 h-4" /> {t.label}
              {tab === t.key && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#4f6ef7] to-[#00c4cc]" />}
            </button>
          ))}
        </div>

        {/* Chat tab */}
        {tab === "chat" && (
          <div className="bg-[#111118]/60 backdrop-blur-xl border border-white/10 rounded-2xl flex flex-col h-[60vh]" data-testid="chat-container">
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.length === 0 && (
                <div className="text-center text-white/50 py-20">
                  <Sparkles className="w-8 h-8 mx-auto mb-3 text-[#4f6ef7]" />
                  <p>Ask Spark.E anything about <strong className="text-white">{studySet?.title || "your study set"}</strong>.</p>
                </div>
              )}
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`} data-testid={`msg-${i}`}>
                  <div className={`max-w-[80%] px-4 py-3 rounded-2xl ${m.role === "user" ? "bg-[#4f6ef7] text-white" : "bg-[#1a1a2a] border border-white/10 text-white/90"}`}>
                    <p className="whitespace-pre-wrap leading-relaxed">{m.message}</p>
                  </div>
                </div>
              ))}
              {busy && (
                <div className="flex justify-start">
                  <div className="px-4 py-3 rounded-2xl bg-[#1a1a2a] border border-white/10 text-white/60 text-sm flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" /> Spark.E is thinking...
                  </div>
                </div>
              )}
            </div>
            <div className="p-4 border-t border-white/10 flex gap-3">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
                placeholder="Ask anything about your study set..."
                data-testid="chat-input"
                className="flex-1 px-4 py-3 rounded-xl bg-[#1a1a2a] border border-white/10 text-white placeholder:text-white/30 focus:border-[#4f6ef7] focus:outline-none"
              />
              <button onClick={send} disabled={busy || !input.trim()} data-testid="send-btn" className="px-5 py-3 rounded-xl bg-[#4f6ef7] text-white hover:shadow-[0_0_24px_rgba(79,110,247,0.5)] disabled:opacity-40 transition">
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Image tab */}
        {tab === "image" && (
          <div className="bg-[#111118]/60 backdrop-blur-xl border border-white/10 rounded-2xl p-8" data-testid="image-tab">
            <h3 className="font-heading font-bold text-xl mb-4">Image / Diagram Analyser</h3>
            <p className="text-white/60 text-sm mb-6">Upload a diagram or image — Spark.E will explain it.</p>
            <input type="file" accept="image/*" onChange={onImagePick} data-testid="image-file-input" className="block w-full text-white/70 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:bg-[#4f6ef7] file:text-white file:cursor-pointer" />
            {imageBase64 && (
              <img src={`data:image/png;base64,${imageBase64}`} alt="preview" className="mt-4 max-h-64 rounded-xl border border-white/10" />
            )}
            <button onClick={analyseImage} disabled={busy || !imageBase64} data-testid="analyse-image-btn" className="mt-4 px-6 py-3 rounded-xl bg-gradient-to-r from-[#4f6ef7] to-[#00c4cc] text-white disabled:opacity-40 transition">
              {busy ? "Analysing..." : "Analyse Image"}
            </button>
            {imageReply && (
              <div className="mt-6 p-5 rounded-xl bg-[#1a1a2a] border border-white/10" data-testid="image-reply">
                <p className="text-white/90 leading-relaxed whitespace-pre-wrap">{imageReply}</p>
              </div>
            )}
          </div>
        )}

        {/* Essay tab */}
        {tab === "essay" && (
          <div className="bg-[#111118]/60 backdrop-blur-xl border border-white/10 rounded-2xl p-8" data-testid="essay-tab">
            <h3 className="font-heading font-bold text-xl mb-4">Essay Grader</h3>
            <p className="text-white/60 text-sm mb-6">Paste your essay below for a structured score and feedback.</p>
            <textarea
              value={essay}
              onChange={(e) => setEssay(e.target.value)}
              data-testid="essay-input"
              placeholder="Paste your essay here..."
              rows={10}
              className="w-full px-4 py-3 rounded-xl bg-[#1a1a2a] border border-white/10 text-white placeholder:text-white/30 focus:border-[#4f6ef7] focus:outline-none font-mono text-sm"
            />
            <button onClick={grade} disabled={busy || essay.trim().length < 50} data-testid="grade-btn" className="mt-4 px-6 py-3 rounded-xl bg-gradient-to-r from-[#4f6ef7] to-[#00c4cc] text-white disabled:opacity-40 transition">
              {busy ? "Grading..." : "Grade Essay"}
            </button>
            {essayResult && (
              <div className="mt-6 grid grid-cols-3 gap-4" data-testid="essay-result">
                <div className="bg-[#1a1a2a] rounded-xl p-6 text-center">
                  <p className="text-xs uppercase tracking-widest text-[#00c4cc] mb-2">Score</p>
                  <p className="font-heading font-extrabold text-5xl gradient-text">{essayResult.score}</p>
                  <p className="text-white/40 text-xs mt-1">/ 100</p>
                </div>
                <div className="col-span-2 bg-[#1a1a2a] rounded-xl p-6">
                  <p className="text-xs uppercase tracking-widest text-[#f5a623] mb-2">Structure</p>
                  <p className="text-white/80 text-sm leading-relaxed">{essayResult.structure_feedback}</p>
                </div>
                <div className="col-span-3 bg-[#1a1a2a] rounded-xl p-6">
                  <p className="text-xs uppercase tracking-widest text-red-400 mb-3">Grammar issues ({essayResult.grammar_issues?.length || 0})</p>
                  <ul className="space-y-2 text-white/70 text-sm">
                    {(essayResult.grammar_issues || []).map((g, i) => <li key={i}>• {g}</li>)}
                  </ul>
                </div>
                <div className="col-span-3 bg-[#1a1a2a] rounded-xl p-6">
                  <p className="text-xs uppercase tracking-widest text-[#00c4cc] mb-3">Suggestions</p>
                  <ul className="space-y-2 text-white/70 text-sm">
                    {(essayResult.suggestions || []).map((s, i) => <li key={i}>→ {s}</li>)}
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
