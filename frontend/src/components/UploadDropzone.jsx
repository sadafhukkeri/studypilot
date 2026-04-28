import { useState, useRef } from "react";
import { Upload as UploadIcon, X, FileText, Youtube, Loader2, CheckCircle2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { toast } from "sonner";

const ACCEPTED = ".pdf,.docx,.pptx,.txt,.png,.jpg,.jpeg";
const FORMATS = ["PDF", "DOCX", "PPT", "TXT", "PNG/JPEG", "YouTube URL"];

export default function UploadDropzone({ onComplete }) {
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const [tab, setTab] = useState("file");
  const [file, setFile] = useState(null);
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("General");
  const [stage, setStage] = useState(null); // null | uploading | parsing | generating | done
  const [drag, setDrag] = useState(false);

  const stages = [
    { key: "uploading", label: "Uploading" },
    { key: "parsing", label: "Parsing" },
    { key: "generating", label: "Generating Tools" },
    { key: "done", label: "Done" },
  ];

  const onDrop = (e) => {
    e.preventDefault();
    setDrag(false);
    const f = e.dataTransfer.files?.[0];
    if (f) setFile(f);
  };

  const submit = async () => {
    if (tab === "file" && !file) return toast.error("Choose a file first");
    if (tab === "youtube" && !youtubeUrl) return toast.error("Paste a YouTube URL");
    setStage("uploading");
    const fd = new FormData();
    if (tab === "file") fd.append("file", file);
    if (tab === "youtube") fd.append("youtube_url", youtubeUrl);
    if (title) fd.append("title", title);
    fd.append("subject", subject);
    try {
      // Show staged progress (non-blocking visual)
      setTimeout(() => setStage("parsing"), 800);
      setTimeout(() => setStage("generating"), 2000);
      const { data } = await api.post("/upload", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setStage("done");
      toast.success("Study set ready!");
      setTimeout(() => {
        if (onComplete) onComplete(data);
        navigate(`/study-set/${data.id}`);
      }, 600);
    } catch (err) {
      setStage(null);
      toast.error(err?.response?.data?.detail || "Upload failed");
    }
  };

  if (stage) {
    return (
      <div className="bg-[#111118]/60 backdrop-blur-xl border border-white/10 rounded-3xl p-12 text-center" data-testid="upload-progress">
        <div className="mb-8">
          <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-[#4f6ef7] to-[#00c4cc] flex items-center justify-center animate-glow-pulse">
            {stage === "done" ? <CheckCircle2 className="w-10 h-10 text-white" /> : <Loader2 className="w-10 h-10 text-white animate-spin" />}
          </div>
        </div>
        <h3 className="font-heading font-bold text-2xl mb-6">{stage === "done" ? "All set!" : "Crafting your study tools..."}</h3>
        <div className="max-w-md mx-auto space-y-3">
          {stages.map((s, i) => {
            const currentIdx = stages.findIndex((x) => x.key === stage);
            const done = i < currentIdx || stage === "done";
            const active = s.key === stage;
            return (
              <div key={s.key} className="flex items-center gap-3 text-left">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                    done ? "bg-[#00c4cc] text-white" : active ? "bg-[#4f6ef7] text-white animate-pulse" : "bg-white/10 text-white/40"
                  }`}
                >
                  {done ? "✓" : i + 1}
                </div>
                <span className={done ? "text-white" : active ? "text-white" : "text-white/40"}>{s.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#111118]/60 backdrop-blur-xl border border-white/10 rounded-3xl p-8" data-testid="upload-zone">
      <div className="flex items-center gap-2 mb-6">
        <button
          onClick={() => setTab("file")}
          data-testid="tab-file"
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            tab === "file" ? "bg-[#4f6ef7] text-white" : "text-white/60 hover:text-white"
          }`}
        >
          <FileText className="w-4 h-4 inline mr-2" /> Upload File
        </button>
        <button
          onClick={() => setTab("youtube")}
          data-testid="tab-youtube"
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            tab === "youtube" ? "bg-[#4f6ef7] text-white" : "text-white/60 hover:text-white"
          }`}
        >
          <Youtube className="w-4 h-4 inline mr-2" /> YouTube URL
        </button>
      </div>

      {tab === "file" ? (
        <div
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          data-testid="upload-dropzone"
          className={`relative border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all ${
            drag ? "border-[#00c4cc] bg-[#00c4cc]/5 shadow-[0_0_30px_rgba(0,196,204,0.2)]" : "border-white/15 hover:border-white/30"
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED}
            className="hidden"
            data-testid="file-input"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
          {file ? (
            <div className="flex items-center justify-center gap-3">
              <FileText className="w-8 h-8 text-[#4f6ef7]" />
              <div className="text-left">
                <p className="text-white font-medium">{file.name}</p>
                <p className="text-white/50 text-sm">{(file.size / 1024).toFixed(1)} KB</p>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); setFile(null); }}
                className="ml-3 p-1 rounded-full hover:bg-white/10"
                data-testid="clear-file-btn"
              >
                <X className="w-4 h-4 text-white/60" />
              </button>
            </div>
          ) : (
            <>
              <UploadIcon className="w-10 h-10 text-[#4f6ef7] mx-auto mb-3" />
              <p className="font-heading font-bold text-2xl mb-2">What will you study today?</p>
              <p className="text-white/50 mb-6">Drag and drop a file or click to browse</p>
              <div className="flex flex-wrap justify-center gap-2">
                {FORMATS.map((f) => (
                  <span key={f} className="px-3 py-1 rounded-full bg-[#1a1a2a] border border-white/10 text-xs text-white/60">{f}</span>
                ))}
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <input
            type="url"
            value={youtubeUrl}
            onChange={(e) => setYoutubeUrl(e.target.value)}
            placeholder="https://youtube.com/watch?v=..."
            data-testid="youtube-input"
            className="w-full px-4 py-3 rounded-xl bg-[#1a1a2a] border border-white/10 text-white placeholder:text-white/30 focus:border-[#4f6ef7] focus:outline-none"
          />
          <p className="text-white/50 text-sm">Paste any YouTube lecture URL — we'll extract the transcript automatically.</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 mt-6">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title (optional)"
          data-testid="title-input"
          className="px-4 py-3 rounded-xl bg-[#1a1a2a] border border-white/10 text-white placeholder:text-white/30 focus:border-[#4f6ef7] focus:outline-none"
        />
        <input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Subject"
          data-testid="subject-input"
          className="px-4 py-3 rounded-xl bg-[#1a1a2a] border border-white/10 text-white placeholder:text-white/30 focus:border-[#4f6ef7] focus:outline-none"
        />
      </div>

      <button
        onClick={submit}
        data-testid="submit-upload-btn"
        className="w-full mt-6 py-3.5 rounded-xl bg-gradient-to-r from-[#4f6ef7] to-[#00c4cc] text-white font-medium hover:shadow-[0_0_30px_rgba(79,110,247,0.5)] transition-all"
      >
        Generate Study Tools
      </button>
    </div>
  );
}
