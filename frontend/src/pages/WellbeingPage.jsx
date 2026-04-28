import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import api from "@/lib/api";
import { Heart, Flame, TrendingUp, Sparkles, RefreshCw, Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

const MOODS = [
  { value: 1, emoji: "😔", label: "Struggling" },
  { value: 2, emoji: "😟", label: "Stressed" },
  { value: 3, emoji: "😐", label: "Okay" },
  { value: 4, emoji: "🙂", label: "Good" },
  { value: 5, emoji: "😄", label: "Great" },
];

export default function WellbeingPage() {
  const [mood, setMood] = useState(null);
  const [note, setNote] = useState("");
  const [moodReply, setMoodReply] = useState("");
  const [moodBusy, setMoodBusy] = useState(false);

  const [burnout, setBurnout] = useState(null);
  const [spark, setSpark] = useState(null);
  const [streak, setStreak] = useState(null);
  const [sparkBusy, setSparkBusy] = useState(false);

  useEffect(() => {
    api.get("/wellbeing/burnout-score").then(({ data }) => setBurnout(data)).catch(() => {});
    api.get("/wellbeing/daily-spark").then(({ data }) => setSpark(data)).catch(() => {});
    api.get("/wellbeing/streak").then(({ data }) => setStreak(data)).catch(() => {});
  }, []);

  const submitMood = async () => {
    if (!mood) return;
    setMoodBusy(true); setMoodReply("");
    try {
      const { data } = await api.post("/wellbeing/mood", { mood, note });
      setMoodReply(data.ai_response);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed");
    } finally {
      setMoodBusy(false);
    }
  };

  const refreshSpark = async () => {
    setSparkBusy(true);
    try {
      const { data } = await api.post("/wellbeing/daily-spark/refresh");
      setSpark(data);
    } catch {} finally { setSparkBusy(false); }
  };

  const stateColor = burnout?.state === "healthy" ? "#00c4cc" : burnout?.state === "caution" ? "#f5a623" : "#ef4444";
  const stateLabel = burnout?.state === "healthy" ? "Healthy" : burnout?.state === "caution" ? "Caution" : "Burnout Risk";

  return (
    <AppShell>
      <div className="p-10 max-w-6xl">
        <div className="mb-8">
          <p className="text-xs uppercase tracking-[0.3em] text-[#00c4cc] mb-2">Wellbeing</p>
          <h1 className="font-heading font-extrabold text-4xl flex items-center gap-3">
            <Heart className="w-8 h-8 text-pink-400" /> Take care of yourself
          </h1>
          <p className="text-white/60 mt-2">Studying hard is great. Studying healthy is greater.</p>
        </div>

        {/* Burnout banner */}
        {burnout?.state === "burnout" && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-6 mb-6" data-testid="burnout-banner">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-red-400 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-heading font-bold text-xl text-red-400 mb-2">You've been working really hard.</h3>
                <p className="text-white/80 text-sm mb-3">Here are 3 things to try today:</p>
                <ul className="space-y-2 text-white/90">
                  {(burnout.suggestions || []).map((s, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <span className="text-red-400">→</span> {s}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-3 gap-6">
          {/* Mood Check-in */}
          <div className="col-span-2 bg-[#111118] border border-white/5 rounded-2xl p-7" data-testid="mood-card">
            <h2 className="font-heading font-bold text-2xl mb-2">Daily Mood Check-in</h2>
            <p className="text-white/50 text-sm mb-5">How are you feeling right now?</p>
            <div className="flex gap-3 mb-5">
              {MOODS.map((m) => (
                <button
                  key={m.value}
                  onClick={() => setMood(m.value)}
                  data-testid={`mood-${m.value}`}
                  className={`flex-1 p-4 rounded-2xl border transition-all ${mood === m.value ? "bg-[#4f6ef7]/15 border-[#4f6ef7]/50 shadow-[0_0_20px_rgba(79,110,247,0.3)]" : "bg-[#1a1a2a] border-white/10 hover:border-white/30"}`}
                >
                  <div className="text-3xl mb-1">{m.emoji}</div>
                  <div className="text-xs text-white/70">{m.label}</div>
                </button>
              ))}
            </div>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value.slice(0, 200))}
              placeholder="What's on your mind? (optional)"
              data-testid="mood-note"
              rows={3}
              className="w-full px-4 py-3 rounded-xl bg-[#1a1a2a] border border-white/10 text-white placeholder:text-white/30 focus:border-[#4f6ef7] focus:outline-none resize-none"
            />
            <p className="text-white/30 text-xs mt-1 text-right">{note.length}/200</p>
            <button
              onClick={submitMood}
              disabled={!mood || moodBusy}
              data-testid="mood-submit"
              className="mt-3 w-full py-3 rounded-xl bg-[#4f6ef7] text-white font-medium hover:shadow-[0_0_24px_rgba(79,110,247,0.5)] disabled:opacity-50 transition flex items-center justify-center gap-2"
            >
              {moodBusy && <Loader2 className="w-4 h-4 animate-spin" />} Submit Check-in
            </button>
            {moodReply && (
              <div className="mt-5 p-4 rounded-xl bg-gradient-to-br from-[#4f6ef7]/10 to-[#00c4cc]/5 border border-[#4f6ef7]/20" data-testid="mood-reply">
                <p className="text-xs uppercase tracking-widest text-[#00c4cc] mb-2">StudyPilot AI says</p>
                <p className="text-white/90 leading-relaxed">{moodReply}</p>
              </div>
            )}
          </div>

          {/* Daily Spark */}
          <div className="bg-gradient-to-br from-[#f5a623]/10 via-[#111118] to-[#4f6ef7]/5 border border-white/10 rounded-2xl p-7 flex flex-col" data-testid="spark-card">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-heading font-bold text-xl flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#f5a623]" /> Daily Spark
              </h2>
              <button onClick={refreshSpark} disabled={sparkBusy} data-testid="spark-refresh" className="p-2 rounded-lg hover:bg-white/5 transition disabled:opacity-50">
                <RefreshCw className={`w-4 h-4 text-white/60 ${sparkBusy ? "animate-spin" : ""}`} />
              </button>
            </div>
            {spark ? (
              <p className="text-white/90 leading-relaxed flex-1" data-testid="spark-message">"{spark.message}"</p>
            ) : (
              <p className="text-white/40 text-sm">Loading...</p>
            )}
          </div>

          {/* Burnout */}
          <div className="bg-[#111118] border border-white/5 rounded-2xl p-7" data-testid="burnout-card">
            <h2 className="font-heading font-bold text-xl mb-1">Burnout Score</h2>
            <p className="text-white/50 text-xs mb-5">Updated weekly · last 7 days</p>
            {burnout ? (
              <>
                <div className="flex items-end justify-between mb-3">
                  <p className="font-heading font-extrabold text-5xl" style={{ color: stateColor }}>{burnout.score}</p>
                  <p className="text-sm font-medium" style={{ color: stateColor }}>{stateLabel}</p>
                </div>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full transition-all" style={{ width: `${burnout.score}%`, backgroundColor: stateColor }} />
                </div>
                <p className="text-white/50 text-xs mt-3">{burnout.sessions_last_7d} study sessions this week</p>
              </>
            ) : (
              <p className="text-white/40 text-sm">Loading...</p>
            )}
          </div>

          {/* Streak */}
          <div className="col-span-2 bg-[#111118] border border-white/5 rounded-2xl p-7" data-testid="streak-card">
            <div className="flex items-end justify-between mb-5">
              <div>
                <h2 className="font-heading font-bold text-xl flex items-center gap-2">
                  <Flame className="w-5 h-5 text-[#f5a623]" /> Study Streak
                </h2>
                <p className="text-white/50 text-xs mt-1">30-day activity</p>
              </div>
              {streak && (
                <div className="flex gap-6">
                  <div>
                    <p className="text-white/40 text-xs uppercase tracking-widest">Current</p>
                    <p className="font-heading font-extrabold text-3xl text-[#f5a623]">{streak.current_streak}<span className="text-sm text-white/50 ml-1">d</span></p>
                  </div>
                  <div>
                    <p className="text-white/40 text-xs uppercase tracking-widest">Longest</p>
                    <p className="font-heading font-extrabold text-3xl text-[#00c4cc]">{streak.longest_streak}<span className="text-sm text-white/50 ml-1">d</span></p>
                  </div>
                </div>
              )}
            </div>
            {/* Heatmap */}
            {streak?.heatmap && (
              <div className="grid grid-cols-[repeat(30,minmax(0,1fr))] gap-1" data-testid="streak-heatmap">
                {streak.heatmap.map((d) => {
                  const intensity = d.count === 0 ? 0 : Math.min(d.count / 5, 1);
                  return (
                    <div
                      key={d.date}
                      title={`${d.date}: ${d.count} activities`}
                      className="aspect-square rounded-sm"
                      style={{ backgroundColor: intensity === 0 ? "rgba(255,255,255,0.04)" : `rgba(0, 196, 204, ${0.2 + intensity * 0.8})` }}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
