import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AppShell from "@/components/AppShell";
import api from "@/lib/api";
import { FileText, Youtube, ArrowRight, BookOpen } from "lucide-react";

export default function StudySetsListPage() {
  const [sets, setSets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/study-sets").then(({ data }) => { setSets(data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  return (
    <AppShell>
      <div className="p-10 max-w-7xl">
        <div className="mb-10">
          <p className="text-xs uppercase tracking-[0.3em] text-[#00c4cc] mb-2">Library</p>
          <h1 className="font-heading font-extrabold text-4xl">My Study Sets</h1>
          <p className="text-white/60 mt-2">All your uploaded materials.</p>
        </div>

        {loading ? (
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-40 bg-[#111118] border border-white/5 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : sets.length === 0 ? (
          <div className="bg-[#111118] border border-white/5 rounded-2xl p-16 text-center">
            <BookOpen className="w-12 h-12 text-white/20 mx-auto mb-4" />
            <h3 className="font-heading font-bold text-xl mb-2">No study sets yet</h3>
            <p className="text-white/50 mb-6">Upload your first material from the dashboard.</p>
            <Link to="/dashboard" className="px-6 py-3 rounded-xl bg-[#4f6ef7] text-white inline-block hover:shadow-[0_0_24px_rgba(79,110,247,0.5)] transition">Go to Dashboard</Link>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-5" data-testid="sets-grid">
            {sets.map((s) => (
              <Link
                key={s.id}
                to={`/study-set/${s.id}`}
                data-testid={`list-set-${s.id}`}
                className="group bg-[#111118] border border-white/5 rounded-2xl p-6 hover:-translate-y-1 hover:border-[#4f6ef7]/40 hover:shadow-[0_0_30px_rgba(79,110,247,0.15)] transition-all"
              >
                <div className="flex items-start justify-between mb-5">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#4f6ef7]/20 to-[#00c4cc]/10 border border-[#4f6ef7]/30 flex items-center justify-center">
                    {s.source_type === "youtube" ? (
                      <Youtube className="w-5 h-5 text-[#4f6ef7]" />
                    ) : (
                      <FileText className="w-5 h-5 text-[#4f6ef7]" />
                    )}
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-[#00c4cc]/10 border border-[#00c4cc]/20 text-[#00c4cc] text-xs">{s.subject}</span>
                </div>
                <h3 className="font-heading font-bold text-lg text-white mb-2 truncate">{s.title}</h3>
                <p className="text-white/40 text-xs mb-4">{new Date(s.created_at).toLocaleDateString()}</p>
                <div className="flex items-center gap-1.5 text-[#4f6ef7] text-sm opacity-70 group-hover:opacity-100 transition">
                  Open study set <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
