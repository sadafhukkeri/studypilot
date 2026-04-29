import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AppShell from "@/components/AppShell";
import api from "@/lib/api";
import { Headphones, Play, Plus } from "lucide-react";
import { toast } from "sonner";

export default function AudioRecapOverviewPage() {
  const [recaps, setRecaps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [studySets, setStudySets] = useState([]);
  const [showPick, setShowPick] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    api.get("/audio-recap").then(({ data }) => { setRecaps(data); setLoading(false); }).catch(() => setLoading(false));
    api.get("/study-sets").then(({ data }) => setStudySets(data));
  }, []);

  const startNew = () => {
    if (studySets.length === 0) {
      toast.error("Upload a study set first");
      return;
    }
    setShowPick(true);
  };

  return (
    <AppShell>
      <div className="p-10 max-w-6xl">
        <div className="flex items-end justify-between mb-10">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-[#00c4cc] mb-2 flex items-center gap-2">
              <Headphones className="w-3 h-3" /> Audio Recap
            </p>
            <h1 className="font-heading font-extrabold text-4xl">Your audio recaps</h1>
            <p className="text-white/60 mt-2">Podcasts, lectures, and audiobooks generated from your notes.</p>
          </div>
          <button
            onClick={startNew}
            data-testid="new-recap-btn"
            className="px-5 py-2.5 rounded-xl bg-[#4f6ef7] text-white hover:shadow-[0_0_24px_rgba(79,110,247,0.5)] transition flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Create New
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => <div key={i} className="h-32 bg-[#111118] rounded-2xl animate-pulse" />)}
          </div>
        ) : recaps.length === 0 ? (
          <div className="bg-[#111118] border border-white/5 rounded-2xl p-16 text-center">
            <Headphones className="w-12 h-12 text-white/20 mx-auto mb-4" />
            <h3 className="font-heading font-bold text-2xl mb-2">No recaps yet</h3>
            <p className="text-white/50 mb-6">Generate your first audio recap from any study set.</p>
            <button onClick={startNew} className="px-6 py-3 rounded-xl bg-[#4f6ef7] text-white inline-flex items-center gap-2 hover:shadow-[0_0_24px_rgba(79,110,247,0.5)] transition">
              <Plus className="w-4 h-4" /> Create New
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4" data-testid="recaps-grid">
            {recaps.map((r) => (
              <Link
                key={r.id}
                to={`/study-set/${r.study_set_id}/audio-recap`}
                className="bg-[#111118] border border-white/5 rounded-2xl p-6 hover:-translate-y-0.5 hover:border-[#00c4cc]/40 hover:shadow-[0_0_30px_rgba(0,196,204,0.15)] transition-all"
                data-testid={`recap-${r.id}`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-11 h-11 rounded-xl bg-[#00c4cc]/15 border border-[#00c4cc]/30 flex items-center justify-center">
                    <Headphones className="w-5 h-5 text-[#00c4cc]" />
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-[#1a1a2a] text-white/70 text-xs capitalize">{r.format}</span>
                </div>
                <h3 className="font-heading font-bold text-lg mb-1 truncate">{r.study_set_title}</h3>
                <p className="text-white/40 text-xs">{r.length_minutes} min · {new Date(r.created_at).toLocaleDateString()}</p>
                <div className="flex items-center gap-1.5 text-[#00c4cc] text-sm mt-4">
                  <Play className="w-3.5 h-3.5" /> Open
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Pick study set modal */}
        {showPick && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center" onClick={() => setShowPick(false)}>
            <div onClick={(e) => e.stopPropagation()} className="bg-[#111118] border border-white/10 rounded-2xl p-8 w-full max-w-md" data-testid="pick-set-modal">
              <h3 className="font-heading font-bold text-xl mb-2">Choose a study set</h3>
              <p className="text-white/60 text-sm mb-5">Audio recaps are generated from a study set's content.</p>
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {studySets.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => navigate(`/study-set/${s.id}/audio-recap`)}
                    data-testid={`pick-${s.id}`}
                    className="w-full text-left px-4 py-3 rounded-xl bg-[#1a1a2a] hover:bg-[#1a1a2a]/80 hover:border-[#4f6ef7]/40 border border-white/5 transition"
                  >
                    <p className="text-white font-medium">{s.title}</p>
                    <p className="text-white/40 text-xs">{s.subject}</p>
                  </button>
                ))}
              </div>
              <button onClick={() => setShowPick(false)} className="mt-5 w-full px-5 py-3 rounded-xl bg-white/5 border border-white/10 text-white hover:bg-white/10 transition">Cancel</button>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
