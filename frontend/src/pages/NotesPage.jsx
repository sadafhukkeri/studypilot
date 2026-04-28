import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import AppShell from "@/components/AppShell";
import api from "@/lib/api";
import { ArrowLeft, Download, Sparkles, Loader2, X, Brain } from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";

const DEPTHS = [
  { key: "summarized", label: "Summarized" },
  { key: "in-depth", label: "In-Depth" },
  { key: "comprehensive", label: "Comprehensive" },
];

// Minimal markdown -> HTML converter (sufficient for headers/bold/lists)
function mdToHtml(md) {
  if (!md) return "";
  let html = md
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  html = html.replace(/^### (.*$)/gm, "<h3>$1</h3>");
  html = html.replace(/^## (.*$)/gm, "<h2>$1</h2>");
  html = html.replace(/^# (.*$)/gm, "<h1>$1</h1>");
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");
  // Lists
  html = html.replace(/(^|\n)((?:[-*] .+\n?)+)/g, (m, p1, list) => {
    const items = list.trim().split("\n").map((l) => l.replace(/^[-*] /, "").trim());
    return `${p1}<ul>${items.map((i) => `<li>${i}</li>`).join("")}</ul>`;
  });
  // Paragraphs
  html = html
    .split(/\n{2,}/)
    .map((block) => {
      if (block.startsWith("<")) return block;
      return `<p>${block.replace(/\n/g, "<br/>")}</p>`;
    })
    .join("");
  return html;
}

export default function NotesPage() {
  const { id } = useParams();
  const [depth, setDepth] = useState("summarized");
  const [markdown, setMarkdown] = useState("");
  const [loading, setLoading] = useState(false);
  const [setTitle, setSetTitle] = useState("");
  // Explain Three Ways
  const [selection, setSelection] = useState("");
  const [tooltipPos, setTooltipPos] = useState(null);
  const [explainOpen, setExplainOpen] = useState(false);
  const [explainTab, setExplainTab] = useState("simple");
  const [explainResult, setExplainResult] = useState(null);
  const [explainBusy, setExplainBusy] = useState(false);

  const handleSelect = () => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) {
      setTooltipPos(null);
      return;
    }
    const txt = sel.toString().trim();
    if (txt.length < 10) {
      setTooltipPos(null);
      return;
    }
    setSelection(txt);
    const range = sel.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    setTooltipPos({ x: rect.left + rect.width / 2, y: rect.top - 50 + window.scrollY });
  };

  const explainNow = async () => {
    setTooltipPos(null);
    setExplainOpen(true);
    setExplainBusy(true);
    setExplainResult(null);
    try {
      const { data } = await api.post("/notes/explain-three-ways", { text: selection });
      setExplainResult(data);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed");
      setExplainOpen(false);
    } finally {
      setExplainBusy(false);
    }
  };

  useEffect(() => {
    api.get(`/study-sets/${id}`).then(({ data }) => setSetTitle(data.title)).catch(() => {});
  }, [id]);

  const generate = async (d = depth) => {
    setLoading(true);
    setMarkdown("");
    try {
      const { data } = await api.post("/notes/generate", { study_set_id: id, depth: d });
      setMarkdown(data.markdown);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed to generate notes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { generate("summarized"); /* eslint-disable-next-line */ }, [id]);

  const downloadPdf = () => {
    if (!markdown) return;
    const doc = new jsPDF({ unit: "pt", format: "letter" });
    const margin = 50;
    const width = doc.internal.pageSize.getWidth() - margin * 2;
    let y = margin;
    doc.setFontSize(18);
    doc.text(setTitle || "Notes", margin, y); y += 30;
    doc.setFontSize(11);
    const lines = doc.splitTextToSize(markdown.replace(/[*#`]/g, ""), width);
    lines.forEach((l) => {
      if (y > doc.internal.pageSize.getHeight() - margin) {
        doc.addPage(); y = margin;
      }
      doc.text(l, margin, y); y += 14;
    });
    doc.save(`${setTitle || "notes"}.pdf`);
  };

  return (
    <AppShell>
      <div className="p-10 max-w-5xl">
        <Link to={`/study-set/${id}`} className="inline-flex items-center gap-2 text-white/60 hover:text-white mb-6 text-sm">
          <ArrowLeft className="w-4 h-4" /> Back to study set
        </Link>

        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-[#4f6ef7] mb-2">Notes AI</p>
            <h1 className="font-heading font-extrabold text-4xl">{setTitle || "Notes"}</h1>
          </div>
          <button
            onClick={downloadPdf}
            disabled={!markdown}
            data-testid="download-pdf-btn"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:border-white/30 hover:bg-white/10 transition disabled:opacity-40"
          >
            <Download className="w-4 h-4" /> Download PDF
          </button>
        </div>

        {/* Depth toggles */}
        <div className="inline-flex bg-[#1a1a2a] border border-white/10 rounded-xl p-1 mb-8" data-testid="depth-toggle">
          {DEPTHS.map((d) => (
            <button
              key={d.key}
              onClick={() => { setDepth(d.key); generate(d.key); }}
              data-testid={`depth-${d.key}`}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
                depth === d.key ? "bg-[#4f6ef7] text-white shadow-[0_0_20px_rgba(79,110,247,0.4)]" : "text-white/60 hover:text-white"
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>

        {/* Notes */}
        <div onMouseUp={handleSelect} className="bg-[#111118] border border-white/5 rounded-2xl p-10 min-h-[400px] relative" data-testid="notes-content">
          {loading ? (
            <div className="flex items-center justify-center py-20 text-white/60">
              <Loader2 className="w-6 h-6 animate-spin mr-3" /> Generating {depth} notes...
            </div>
          ) : (
            <div className="notes-md" dangerouslySetInnerHTML={{ __html: mdToHtml(markdown) }} />
          )}
        </div>

        {/* Floating tooltip on selection */}
        {tooltipPos && (
          <button
            onClick={explainNow}
            data-testid="explain-tooltip-btn"
            className="fixed z-40 px-3 py-2 rounded-lg bg-gradient-to-r from-[#4f6ef7] to-[#00c4cc] text-white text-xs font-medium shadow-[0_0_24px_rgba(79,110,247,0.5)] hover:scale-105 transition flex items-center gap-1.5"
            style={{ left: tooltipPos.x, top: tooltipPos.y, transform: "translateX(-50%)" }}
          >
            <Brain className="w-3.5 h-3.5" /> Explain it 3 ways
          </button>
        )}

        {/* Side panel */}
        {explainOpen && (
          <div className="fixed inset-0 z-50 flex justify-end" data-testid="explain-panel">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setExplainOpen(false)} />
            <div className="relative w-[480px] h-full bg-[#111118] border-l border-white/10 shadow-2xl overflow-y-auto">
              <div className="p-6 border-b border-white/10 flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-[#00c4cc] mb-1">Explain it 3 ways</p>
                  <h3 className="font-heading font-bold text-lg text-white">Three perspectives</h3>
                </div>
                <button onClick={() => setExplainOpen(false)} className="p-2 rounded-lg hover:bg-white/5 transition" data-testid="explain-close">
                  <X className="w-5 h-5 text-white/60" />
                </button>
              </div>
              <div className="p-6">
                <p className="text-xs uppercase tracking-widest text-white/40 mb-2">Selected text</p>
                <p className="text-white/70 text-sm italic mb-6 line-clamp-3">"{selection}"</p>

                <div className="flex border-b border-white/10 mb-5">
                  {["simple", "exam", "advanced"].map((t) => (
                    <button
                      key={t}
                      onClick={() => setExplainTab(t)}
                      data-testid={`explain-tab-${t}`}
                      className={`relative px-4 py-2.5 text-sm font-medium capitalize transition ${explainTab === t ? "text-white" : "text-white/50 hover:text-white/80"}`}
                    >
                      {t === "exam" ? "Exam-level" : t}
                      {explainTab === t && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#4f6ef7] to-[#00c4cc]" />}
                    </button>
                  ))}
                </div>

                {explainBusy ? (
                  <div className="flex items-center gap-3 text-white/60 py-12 justify-center">
                    <Loader2 className="w-5 h-5 animate-spin" /> Generating explanations...
                  </div>
                ) : explainResult ? (
                  <div className="text-white/85 leading-relaxed" data-testid="explain-content">
                    {explainResult[explainTab]}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        )}

        {/* Floating StudyPilot AI button */}
        <Link
          to={`/study-set/${id}/chat`}
          data-testid="floating-sparke-btn"
          className="fixed bottom-8 right-8 group flex items-center gap-3 px-5 py-3.5 rounded-full bg-gradient-to-r from-[#4f6ef7] to-[#00c4cc] text-white font-medium shadow-[0_0_30px_rgba(79,110,247,0.5)] hover:scale-105 transition-all"
        >
          <Sparkles className="w-5 h-5" /> Ask StudyPilot AI
        </Link>
      </div>
    </AppShell>
  );
}
