import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import AppShell from "@/components/AppShell";
import api from "@/lib/api";
import { ArrowLeft, Loader2, RotateCw, Share2, Trophy } from "lucide-react";
import { toast } from "sonner";

export default function ArcadeGamePage() {
  const { setId, mode } = useParams();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.post("/arcade/generate", { study_set_id: setId, mode })
      .then(({ data }) => setItems(data.items || []))
      .catch((e) => toast.error(e?.response?.data?.detail || "Failed"))
      .finally(() => setLoading(false));
  }, [setId, mode]);

  const saveScore = async (score, extra = {}) => {
    try {
      await api.post("/arcade/score", { study_set_id: setId, mode, score, extra });
    } catch {}
  };

  if (loading) {
    return (
      <AppShell>
        <div className="p-10 flex items-center gap-3 text-white/60">
          <Loader2 className="w-5 h-5 animate-spin" /> Generating game...
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="p-10 max-w-5xl mx-auto">
        <Link to="/arcade" className="inline-flex items-center gap-2 text-white/60 hover:text-white mb-6 text-sm">
          <ArrowLeft className="w-4 h-4" /> Back to Arcade
        </Link>
        {mode === "match" && <MatchGame items={items} onFinish={saveScore} />}
        {mode === "fill" && <FillGame items={items} onFinish={saveScore} />}
        {mode === "blitz" && <BlitzGame items={items} onFinish={saveScore} />}
      </div>
    </AppShell>
  );
}

// ==================== MATCH ====================
function MatchGame({ items, onFinish }) {
  const [cards, setCards] = useState([]);
  const [flipped, setFlipped] = useState([]); // indices currently shown but not matched
  const [matched, setMatched] = useState(new Set());
  const [moves, setMoves] = useState(0);
  const [time, setTime] = useState(0);
  const [running, setRunning] = useState(true);
  const finished = items.length > 0 && matched.size === items.length * 2;

  useEffect(() => {
    if (!items.length) return;
    const arr = [];
    items.forEach((it, i) => {
      arr.push({ id: `t${i}`, pair: i, kind: "term", text: it.term });
      arr.push({ id: `d${i}`, pair: i, kind: "def", text: it.definition });
    });
    arr.sort(() => Math.random() - 0.5);
    setCards(arr);
  }, [items]);

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setTime((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [running]);

  useEffect(() => {
    if (finished) {
      setRunning(false);
      const score = Math.max(1000 - time * 5 - moves * 5, 50);
      onFinish(score, { time, moves });
    }
    // eslint-disable-next-line
  }, [finished]);

  const click = (i) => {
    if (matched.has(i) || flipped.includes(i) || flipped.length >= 2) return;
    const newFlipped = [...flipped, i];
    setFlipped(newFlipped);
    if (newFlipped.length === 2) {
      setMoves((m) => m + 1);
      const [a, b] = newFlipped;
      if (cards[a].pair === cards[b].pair && cards[a].kind !== cards[b].kind) {
        setTimeout(() => {
          setMatched((s) => new Set([...s, a, b]));
          setFlipped([]);
        }, 400);
      } else {
        setTimeout(() => setFlipped([]), 1000);
      }
    }
  };

  const reset = () => {
    setFlipped([]); setMatched(new Set()); setMoves(0); setTime(0); setRunning(true);
    setCards([...cards].sort(() => Math.random() - 0.5));
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-[#4f6ef7] mb-1">Mode 1</p>
          <h1 className="font-heading font-extrabold text-3xl">Match the Term</h1>
        </div>
        <div className="flex gap-3 text-sm font-mono">
          <span className="px-4 py-2 rounded-xl bg-[#1a1a2a] border border-white/10 text-white" data-testid="match-time">⏱ {time}s</span>
          <span className="px-4 py-2 rounded-xl bg-[#1a1a2a] border border-white/10 text-white">Moves: {moves}</span>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {cards.map((c, i) => {
          const isShown = matched.has(i) || flipped.includes(i);
          return (
            <button
              key={c.id}
              onClick={() => click(i)}
              data-testid={`match-card-${i}`}
              className={`aspect-[4/3] rounded-2xl p-4 text-center transition-all ${
                isShown
                  ? matched.has(i)
                    ? "bg-[#00c4cc]/15 border border-[#00c4cc]/40"
                    : "bg-[#4f6ef7]/15 border border-[#4f6ef7]/40"
                  : "bg-[#1a1a2a] border border-white/10 hover:border-white/30"
              }`}
            >
              {isShown ? (
                <div className="flex flex-col items-center justify-center h-full">
                  <p className="text-xs uppercase tracking-widest text-white/40 mb-2">{c.kind === "term" ? "Term" : "Definition"}</p>
                  <p className="text-sm text-white leading-snug">{c.text}</p>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-3xl text-white/20">?</div>
              )}
            </button>
          );
        })}
      </div>

      {finished && (
        <div className="mt-8 bg-gradient-to-br from-[#4f6ef7]/15 to-[#00c4cc]/10 border border-white/10 rounded-2xl p-8 text-center" data-testid="match-finish">
          <Trophy className="w-10 h-10 text-[#f5a623] mx-auto mb-3" />
          <h3 className="font-heading font-extrabold text-3xl mb-2">All matched!</h3>
          <p className="text-white/60 mb-6">{time}s · {moves} moves · Score: <span className="text-[#f5a623] font-bold">{Math.max(1000 - time * 5 - moves * 5, 50)}</span></p>
          <div className="flex gap-3 justify-center">
            <button onClick={reset} data-testid="play-again-btn" className="px-5 py-2.5 rounded-xl bg-[#4f6ef7] text-white flex items-center gap-2"><RotateCw className="w-4 h-4" /> Play Again</button>
            <button className="px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white flex items-center gap-2"><Share2 className="w-4 h-4" /> Share Score</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ==================== FILL ====================
function FillGame({ items, onFinish }) {
  const [idx, setIdx] = useState(0);
  const [time, setTime] = useState(60);
  const [score, setScore] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [input, setInput] = useState("");
  const [feedback, setFeedback] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (done) return;
    if (time <= 0) { setDone(true); return; }
    const t = setTimeout(() => setTime((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [time, done]);

  useEffect(() => {
    if (done) onFinish(score, { correct, attempts });
    // eslint-disable-next-line
  }, [done]);

  const submit = () => {
    if (!items[idx] || done) return;
    const expected = items[idx].answer.trim().toLowerCase();
    const got = input.trim().toLowerCase();
    setAttempts((a) => a + 1);
    if (expected && got && (expected === got || expected.includes(got) || got.includes(expected))) {
      setScore((s) => s + 10);
      setCorrect((c) => c + 1);
      setFeedback("✓ Correct!");
    } else {
      setFeedback(`✗ Answer was: ${items[idx].answer}`);
    }
    setTimeout(() => {
      setFeedback("");
      setInput("");
      if (idx + 1 >= items.length) setDone(true);
      else setIdx((i) => i + 1);
    }, 900);
  };

  const reset = () => {
    setIdx(0); setTime(60); setScore(0); setCorrect(0); setAttempts(0); setInput(""); setFeedback(""); setDone(false);
  };

  if (done) {
    const acc = attempts ? Math.round((correct / attempts) * 100) : 0;
    return (
      <div className="bg-gradient-to-br from-[#00c4cc]/15 to-[#4f6ef7]/10 border border-white/10 rounded-3xl p-12 text-center" data-testid="fill-finish">
        <Trophy className="w-12 h-12 text-[#f5a623] mx-auto mb-4" />
        <h2 className="font-heading font-extrabold text-4xl mb-3 gradient-text">Time's up!</h2>
        <p className="text-white/70 mb-1">Score: <span className="text-[#f5a623] font-bold text-2xl">{score}</span></p>
        <p className="text-white/60">Accuracy: {acc}% ({correct}/{attempts})</p>
        <div className="flex gap-3 justify-center mt-6">
          <button onClick={reset} className="px-5 py-2.5 rounded-xl bg-[#4f6ef7] text-white flex items-center gap-2"><RotateCw className="w-4 h-4" /> Play Again</button>
        </div>
      </div>
    );
  }

  const it = items[idx];
  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-[#00c4cc] mb-1">Mode 2</p>
          <h1 className="font-heading font-extrabold text-3xl">Fill-in-Blank Race</h1>
        </div>
        <div className="flex gap-3 text-sm font-mono">
          <span className="px-4 py-2 rounded-xl bg-[#1a1a2a] border border-white/10 text-white" data-testid="fill-time">⏱ {time}s</span>
          <span className="px-4 py-2 rounded-xl bg-[#f5a623]/10 border border-[#f5a623]/30 text-[#f5a623]">Score: {score}</span>
        </div>
      </div>

      <div className="bg-[#111118] border border-white/5 rounded-2xl p-12 text-center min-h-[300px] flex flex-col items-center justify-center">
        <p className="font-heading font-bold text-2xl text-white mb-8 leading-relaxed max-w-3xl">{it?.sentence}</p>
        <input
          autoFocus
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="Type your answer..."
          data-testid="fill-input"
          className="w-full max-w-md px-5 py-3.5 rounded-xl bg-[#1a1a2a] border-2 border-white/10 text-white text-center text-lg focus:border-[#00c4cc] focus:outline-none"
        />
        <button onClick={submit} data-testid="fill-submit" className="mt-4 px-8 py-3 rounded-xl bg-[#00c4cc] text-white font-medium hover:shadow-[0_0_24px_rgba(0,196,204,0.5)] transition">Submit</button>
        {feedback && (
          <p className={`mt-4 font-medium ${feedback.startsWith("✓") ? "text-[#00c4cc]" : "text-red-400"}`}>{feedback}</p>
        )}
      </div>
    </div>
  );
}

// ==================== BLITZ ====================
function BlitzGame({ items, onFinish }) {
  const [idx, setIdx] = useState(0);
  const [time, setTime] = useState(5);
  const [score, setScore] = useState(0);
  const [flash, setFlash] = useState(null); // 'green' | 'red'
  const [feedback, setFeedback] = useState("");
  const [done, setDone] = useState(false);
  const list = items.slice(0, 10);

  useEffect(() => {
    if (done) return;
    if (time <= 0) { advance(false); return; }
    const t = setTimeout(() => setTime((s) => s - 1), 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line
  }, [time, done]);

  useEffect(() => {
    if (done) onFinish(score);
    // eslint-disable-next-line
  }, [done]);

  const advance = (correct) => {
    setFlash(correct ? "green" : "red");
    if (correct) setScore((s) => s + 1);
    if (!correct && list[idx]) setFeedback(`Correct: ${list[idx].is_true ? "TRUE" : "FALSE"}`);
    setTimeout(() => {
      setFlash(null); setFeedback("");
      if (idx + 1 >= list.length) setDone(true);
      else { setIdx((i) => i + 1); setTime(5); }
    }, 700);
  };

  const answer = (val) => {
    if (!list[idx]) return;
    advance(list[idx].is_true === val);
  };

  const reset = () => { setIdx(0); setTime(5); setScore(0); setDone(false); };

  if (done) {
    return (
      <div className="bg-gradient-to-br from-[#f5a623]/15 to-[#4f6ef7]/10 border border-white/10 rounded-3xl p-12 text-center" data-testid="blitz-finish">
        <Trophy className="w-12 h-12 text-[#f5a623] mx-auto mb-4" />
        <h2 className="font-heading font-extrabold text-4xl mb-3 gradient-text">Blitz complete!</h2>
        <p className="text-white/70 mb-1">Final score: <span className="text-[#f5a623] font-bold text-3xl">{score} / {list.length}</span></p>
        <button onClick={reset} className="mt-6 px-5 py-2.5 rounded-xl bg-[#4f6ef7] text-white inline-flex items-center gap-2">
          <RotateCw className="w-4 h-4" /> Play Again
        </button>
      </div>
    );
  }

  const it = list[idx];
  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-[#f5a623] mb-1">Mode 3</p>
          <h1 className="font-heading font-extrabold text-3xl">True / False Blitz</h1>
        </div>
        <div className="flex gap-3 text-sm font-mono">
          <span className="px-4 py-2 rounded-xl bg-[#1a1a2a] border border-white/10 text-white" data-testid="blitz-time">⏱ {time}s</span>
          <span className="px-4 py-2 rounded-xl bg-[#f5a623]/10 border border-[#f5a623]/30 text-[#f5a623]">Score: {score}</span>
          <span className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white">{idx + 1}/{list.length}</span>
        </div>
      </div>

      <div
        className={`relative bg-[#111118] border-2 rounded-3xl p-12 text-center min-h-[300px] flex flex-col items-center justify-center transition-all ${
          flash === "green" ? "border-[#00c4cc] shadow-[0_0_60px_rgba(0,196,204,0.6)]" : flash === "red" ? "border-red-500 shadow-[0_0_60px_rgba(239,68,68,0.6)]" : "border-white/5"
        }`}
        data-testid="blitz-statement"
      >
        <p className="font-heading font-bold text-2xl text-white max-w-3xl leading-relaxed">{it?.statement}</p>
        {feedback && <p className="mt-4 text-red-400 font-medium">{feedback}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4 mt-6">
        <button
          onClick={() => answer(true)}
          data-testid="blitz-true-btn"
          className="py-6 rounded-2xl bg-[#00c4cc]/15 border-2 border-[#00c4cc]/40 text-[#00c4cc] font-heading font-extrabold text-2xl hover:bg-[#00c4cc]/25 hover:shadow-[0_0_30px_rgba(0,196,204,0.4)] transition-all"
        >
          TRUE
        </button>
        <button
          onClick={() => answer(false)}
          data-testid="blitz-false-btn"
          className="py-6 rounded-2xl bg-red-500/15 border-2 border-red-500/40 text-red-400 font-heading font-extrabold text-2xl hover:bg-red-500/25 hover:shadow-[0_0_30px_rgba(239,68,68,0.4)] transition-all"
        >
          FALSE
        </button>
      </div>
    </div>
  );
}
