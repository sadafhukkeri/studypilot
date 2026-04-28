import { useEffect, useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import AppShell from "@/components/AppShell";
import api from "@/lib/api";
import { Trophy, Gamepad2, Brain, Timer, Zap } from "lucide-react";

const ARCADE_IMG = "https://static.prod-images.emergentagent.com/jobs/08888170-6c2f-493c-8280-6dacc6606bf6/images/59758a29f9b5b6e1a4c7998940c667a0eedc4f3572d7bca81a09572ba991b56d.png";

const MODES = [
  { key: "match", title: "Match the Term", desc: "Memory grid: pair terms with definitions", icon: Brain, color: "#4f6ef7" },
  { key: "fill", title: "Fill-in-Blank Race", desc: "Type missing terms before time runs out", icon: Timer, color: "#00c4cc" },
  { key: "blitz", title: "True/False Blitz", desc: "10 statements, 5 seconds each", icon: Zap, color: "#f5a623" },
];

export default function ArcadePage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const preselect = params.get("set") || "";
  const [sets, setSets] = useState([]);
  const [activeSet, setActiveSet] = useState(preselect);
  const [board, setBoard] = useState([]);

  useEffect(() => {
    api.get("/study-sets").then(({ data }) => {
      setSets(data);
      if (!activeSet && data.length > 0) setActiveSet(data[0].id);
    });
    api.get("/arcade/leaderboard").then(({ data }) => setBoard(data));
    // eslint-disable-next-line
  }, []);

  return (
    <AppShell>
      <div className="p-10 max-w-7xl">
        {/* Hero */}
        <div className="grid grid-cols-12 gap-8 items-center mb-10">
          <div className="col-span-8">
            <p className="text-xs uppercase tracking-[0.3em] text-[#f5a623] mb-2">Arcade</p>
            <h1 className="font-heading font-extrabold text-5xl mb-3">Turn studying <span className="gradient-text">into a game</span></h1>
            <p className="text-white/60 max-w-xl">Three modes that reinforce your material with speed, recall, and pattern recognition.</p>
          </div>
          <div className="col-span-4 relative">
            <div className="absolute inset-0 bg-gradient-to-br from-[#f5a623]/15 to-transparent blur-3xl" />
            <img src={ARCADE_IMG} alt="Arcade" className="relative w-full max-w-[220px] mx-auto animate-float" />
          </div>
        </div>

        {/* Set picker */}
        <div className="bg-[#111118] border border-white/5 rounded-2xl p-5 mb-8 flex items-center gap-4">
          <Gamepad2 className="w-5 h-5 text-[#4f6ef7]" />
          <span className="text-white/70 text-sm">Play from:</span>
          <select
            value={activeSet}
            onChange={(e) => setActiveSet(e.target.value)}
            data-testid="arcade-set-select"
            className="px-4 py-2 rounded-xl bg-[#1a1a2a] border border-white/10 text-white text-sm focus:border-[#4f6ef7] focus:outline-none flex-1"
          >
            <option value="">Select a study set...</option>
            {sets.map((s) => <option key={s.id} value={s.id}>{s.title} — {s.subject}</option>)}
          </select>
        </div>

        {/* Mode cards */}
        <div className="grid grid-cols-3 gap-5 mb-12">
          {MODES.map((m) => (
            <button
              key={m.key}
              onClick={() => activeSet && navigate(`/arcade/play/${activeSet}/${m.key}`)}
              disabled={!activeSet}
              data-testid={`arcade-mode-${m.key}`}
              className="group relative bg-[#111118] border border-white/5 rounded-2xl p-7 text-left hover:-translate-y-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
            >
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center mb-5"
                style={{ backgroundColor: `${m.color}1a`, border: `1px solid ${m.color}33` }}
              >
                <m.icon className="w-6 h-6" style={{ color: m.color }} />
              </div>
              <h3 className="font-heading font-bold text-xl mb-2">{m.title}</h3>
              <p className="text-white/55 text-sm leading-relaxed">{m.desc}</p>
              <div
                className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                style={{ boxShadow: `0 0 40px ${m.color}33`, border: `1px solid ${m.color}50` }}
              />
            </button>
          ))}
        </div>

        {/* Leaderboard */}
        <div className="bg-[#111118] border border-white/5 rounded-2xl p-6">
          <h2 className="font-heading font-bold text-2xl mb-5 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-[#f5a623]" /> Your scores
          </h2>
          {board.length === 0 ? (
            <p className="text-white/50 text-sm">Play a game to start tracking your scores.</p>
          ) : (
            <div className="overflow-x-auto" data-testid="leaderboard">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-white/40 text-xs uppercase tracking-widest border-b border-white/5">
                    <th className="text-left py-3 px-2">Mode</th>
                    <th className="text-left py-3 px-2">Study Set</th>
                    <th className="text-right py-3 px-2">Score</th>
                    <th className="text-right py-3 px-2">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {board.map((b) => (
                    <tr key={b.id} className="border-b border-white/5 hover:bg-white/2">
                      <td className="py-3 px-2 capitalize text-white/80">{b.mode}</td>
                      <td className="py-3 px-2 text-white/70 truncate max-w-xs">{b.study_set_title}</td>
                      <td className="py-3 px-2 text-right font-mono font-bold text-[#f5a623]">{b.score}</td>
                      <td className="py-3 px-2 text-right text-white/40 text-xs">{new Date(b.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
