import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import AppShell from "@/components/AppShell";
import api from "@/lib/api";
import { FileText, Zap, BookOpen, MessageCircle, Gamepad2, ArrowRight, Calendar, Film, Headphones } from "lucide-react";

const TOOLS = [
  { key: "notes", title: "Notes AI", desc: "Structured notes at any depth", icon: FileText, color: "#4f6ef7", route: "notes" },
  { key: "flashcards", title: "Flashcards AI", desc: "Spaced repetition flip cards", icon: Zap, color: "#00c4cc", route: "flashcards" },
  { key: "quiz", title: "Quiz Generator", desc: "10 questions, instant feedback", icon: BookOpen, color: "#f5a623", route: "quiz" },
  { key: "chat", title: "StudyPilot AI Chat", desc: "Tutor that knows your material", icon: MessageCircle, color: "#4f6ef7", route: "chat" },
  { key: "arcade", title: "Arcade", desc: "3 game modes", icon: Gamepad2, color: "#00c4cc", route: "arcade" },
  { key: "reels", title: "Micro Reels", desc: "Bite-sized concept videos", icon: Film, color: "#f5a623", route: "reels" },
  { key: "audio", title: "Audio Recap", desc: "Podcast, lecture, or audiobook", icon: Headphones, color: "#00c4cc", route: "audio-recap" },
];

export default function StudySetPage() {
  const { id } = useParams();
  const [set, setSet] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/study-sets/${id}`).then(({ data }) => { setSet(data); setLoading(false); }).catch(() => setLoading(false));
  }, [id]);

  if (loading) {
    return <AppShell><div className="p-10"><div className="h-32 bg-[#111118] rounded-2xl animate-pulse" /></div></AppShell>;
  }
  if (!set) {
    return <AppShell><div className="p-10 text-white/60">Study set not found.</div></AppShell>;
  }

  return (
    <AppShell>
      <div className="p-10 max-w-7xl">
        {/* Header */}
        <div className="mb-10 flex items-end justify-between">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <span className="px-3 py-1 rounded-full bg-[#00c4cc]/10 border border-[#00c4cc]/30 text-[#00c4cc] text-xs">{set.subject}</span>
              <span className="text-white/50 text-sm">{new Date(set.created_at).toLocaleDateString()}</span>
            </div>
            <h1 className="font-heading font-extrabold text-4xl text-white" data-testid="study-set-title">{set.title}</h1>
            <p className="text-white/60 mt-2 text-sm max-w-2xl">{set.raw_text?.slice(0, 200)}...</p>
          </div>
          <Link to="/calendar" className="text-sm text-white/60 hover:text-white flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10">
            <Calendar className="w-4 h-4" /> Schedule study
          </Link>
        </div>

        {/* Tools grid */}
        <div className="grid grid-cols-3 gap-5">
          {TOOLS.map((t) => {
            const target = t.key === "arcade" ? `/arcade?set=${set.id}` : `/study-set/${set.id}/${t.route}`;
            return (
              <Link
                key={t.key}
                to={target}
                data-testid={`tool-card-${t.key}`}
                className="group relative bg-[#111118] border border-white/5 rounded-2xl p-7 hover:-translate-y-1 transition-all duration-300"
                style={{ "--c": t.color }}
              >
                <div
                  className="w-14 h-14 rounded-xl flex items-center justify-center mb-5 transition-all"
                  style={{ backgroundColor: `${t.color}1a`, border: `1px solid ${t.color}33` }}
                >
                  <t.icon className="w-6 h-6" style={{ color: t.color }} />
                </div>
                <h3 className="font-heading font-bold text-xl mb-1.5">{t.title}</h3>
                <p className="text-white/55 text-sm leading-relaxed mb-5">{t.desc}</p>
                <div className="flex items-center gap-1.5 text-sm" style={{ color: t.color }}>
                  Open <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition" />
                </div>
                <div
                  className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                  style={{ boxShadow: `0 0 40px ${t.color}33`, border: `1px solid ${t.color}40` }}
                />
              </Link>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
