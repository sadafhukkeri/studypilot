import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import AppShell from "@/components/AppShell";
import api from "@/lib/api";
import { ArrowLeft, Download, Sparkles, Loader2 } from "lucide-react";
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
        <div className="bg-[#111118] border border-white/5 rounded-2xl p-10 min-h-[400px]" data-testid="notes-content">
          {loading ? (
            <div className="flex items-center justify-center py-20 text-white/60">
              <Loader2 className="w-6 h-6 animate-spin mr-3" /> Generating {depth} notes...
            </div>
          ) : (
            <div className="notes-md" dangerouslySetInnerHTML={{ __html: mdToHtml(markdown) }} />
          )}
        </div>

        {/* Floating Spark.E button */}
        <Link
          to={`/study-set/${id}/chat`}
          data-testid="floating-sparke-btn"
          className="fixed bottom-8 right-8 group flex items-center gap-3 px-5 py-3.5 rounded-full bg-gradient-to-r from-[#4f6ef7] to-[#00c4cc] text-white font-medium shadow-[0_0_30px_rgba(79,110,247,0.5)] hover:scale-105 transition-all"
        >
          <Sparkles className="w-5 h-5" /> Ask Spark.E
        </Link>
      </div>
    </AppShell>
  );
}
