import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AppShell from "@/components/AppShell";
import UploadDropzone from "@/components/UploadDropzone";
import { useAuth } from "@/contexts/AuthContext";
import api from "@/lib/api";
import { Sparkles, FileText, Youtube, ArrowRight, Trophy, BookOpen, Calendar } from "lucide-react";

const MASCOT_IMG = "https://static.prod-images.emergentagent.com/jobs/08888170-6c2f-493c-8280-6dacc6606bf6/images/60ac151ee6a23e8e0074f7a4d36e0c2c2734542576ebf15ba7bf57040a877979.png";

export default function Dashboard() {
  const { user } = useAuth();
  const [sets, setSets] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const { data } = await api.get("/study-sets");
      setSets(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const onUploadDone = () => load();

  const checklist = [
    { done: !!user, label: "Sign up for StudyPilot" },
    { done: sets.length > 0, label: "Upload your first study set" },
    { done: false, label: "Try StudyPilot AI Tutor" },
    { done: false, label: "Play an Arcade game" },
  ];

  return (
    <AppShell>
      <div className="p-10 max-w-7xl">
        {/* Greeting */}
        <div className="mb-10 flex items-end justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-[#00c4cc] mb-2">Dashboard</p>
            <h1 className="font-heading font-extrabold text-4xl text-white">
              Hi, {user?.name?.split(" ")[0] || "there"} 👋
            </h1>
            <p className="text-white/60 mt-2">Let's keep learning. Upload anything to get started.</p>
          </div>
          <Link
            to="/studypilotai"
            data-testid="quick-sparke-btn"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white hover:border-[#4f6ef7]/50 hover:bg-[#4f6ef7]/10 transition"
          >
            <Sparkles className="w-4 h-4 text-[#00c4cc]" /> Ask StudyPilot AI
          </Link>
        </div>

        {/* Upload */}
        <UploadDropzone onComplete={onUploadDone} />

        {/* Onboarding + Recents grid */}
        <div className="grid grid-cols-3 gap-6 mt-10">
          <div className="col-span-2">
            <h2 className="font-heading font-bold text-2xl mb-5 text-white">Recent study sets</h2>
            {loading ? (
              <div className="grid grid-cols-2 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-32 bg-[#111118] border border-white/5 rounded-2xl animate-pulse" />
                ))}
              </div>
            ) : sets.length === 0 ? (
              <div className="bg-[#111118] border border-white/5 rounded-2xl p-10 text-center">
                <BookOpen className="w-10 h-10 text-white/30 mx-auto mb-3" />
                <p className="text-white/60">No study sets yet. Upload something above to begin.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4" data-testid="recent-sets-grid">
                {sets.slice(0, 6).map((s) => (
                  <Link
                    key={s.id}
                    to={`/study-set/${s.id}`}
                    data-testid={`set-card-${s.id}`}
                    className="group bg-[#111118] border border-white/5 rounded-2xl p-5 hover:-translate-y-0.5 hover:border-[#4f6ef7]/40 hover:shadow-[0_0_30px_rgba(79,110,247,0.15)] transition-all"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-10 h-10 rounded-lg bg-[#4f6ef7]/15 border border-[#4f6ef7]/30 flex items-center justify-center">
                        {s.source_type === "youtube" ? (
                          <Youtube className="w-5 h-5 text-[#4f6ef7]" />
                        ) : (
                          <FileText className="w-5 h-5 text-[#4f6ef7]" />
                        )}
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-[#00c4cc]/10 text-[#00c4cc] text-xs">{s.subject}</span>
                    </div>
                    <h3 className="font-semibold text-white mb-1 truncate">{s.title}</h3>
                    <p className="text-white/40 text-xs">{new Date(s.created_at).toLocaleDateString()}</p>
                    <div className="mt-4 flex items-center gap-1 text-[#4f6ef7] text-sm opacity-0 group-hover:opacity-100 transition">
                      Open <ArrowRight className="w-3.5 h-3.5" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Onboarding sidebar */}
          <div className="bg-gradient-to-br from-[#4f6ef7]/10 via-[#111118] to-[#00c4cc]/5 border border-white/10 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <img src={MASCOT_IMG} alt="StudyPilot AI" className="w-12 h-12" />
              <div>
                <h3 className="font-heading font-bold text-white">Get started</h3>
                <p className="text-white/50 text-xs">StudyPilot AI's tour</p>
              </div>
            </div>
            <ul className="space-y-3">
              {checklist.map((c, i) => (
                <li key={i} className="flex items-center gap-3 text-sm" data-testid={`checklist-${i}`}>
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${c.done ? "bg-[#00c4cc] text-white" : "border border-white/20 text-white/40"}`}>
                    {c.done && "✓"}
                  </div>
                  <span className={c.done ? "text-white/50 line-through" : "text-white/80"}>{c.label}</span>
                </li>
              ))}
            </ul>
            <div className="mt-6 pt-6 border-t border-white/10 grid grid-cols-2 gap-3">
              <Link to="/arcade" className="flex flex-col items-center gap-1 p-3 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 text-xs transition" data-testid="quick-arcade">
                <Trophy className="w-4 h-4 text-[#f5a623]" /> Arcade
              </Link>
              <Link to="/calendar" className="flex flex-col items-center gap-1 p-3 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 text-xs transition" data-testid="quick-calendar">
                <Calendar className="w-4 h-4 text-[#00c4cc]" /> Calendar
              </Link>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
