import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import AppShell from "@/components/AppShell";
import api from "@/lib/api";
import { ArrowLeft, CheckCircle2, XCircle, Loader2, RotateCw } from "lucide-react";
import { toast } from "sonner";

export default function QuizPage() {
  const { id } = useParams();
  const [questions, setQuestions] = useState([]);
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const [answers, setAnswers] = useState([]);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(true);
  const [setTitle, setSetTitle] = useState("");
  const [weak, setWeak] = useState([]);

  useEffect(() => {
    api.get(`/study-sets/${id}`).then(({ data }) => setSetTitle(data.title)).catch(() => {});
  }, [id]);

  const load = async () => {
    setLoading(true); setDone(false); setIdx(0); setAnswers([]); setSelected(null); setRevealed(false);
    try {
      const { data } = await api.post("/quiz/generate", { study_set_id: id });
      setQuestions(data.questions || []);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed to load quiz");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  const q = questions[idx];

  const submitAnswer = () => {
    if (!selected) return;
    const correct = selected === q.answer;
    setRevealed(true);
    setAnswers((a) => [...a, {
      question_id: q.id,
      question: q.question,
      selected,
      answer: q.answer,
      correct,
    }]);
  };

  const nextQ = async () => {
    if (idx + 1 >= questions.length) {
      // Submit
      const score = answers.filter((a) => a.correct).length;
      try {
        const { data } = await api.post("/quiz/submit", {
          study_set_id: id,
          answers,
          score,
          total: questions.length,
        });
        setWeak(data.weak_topics || []);
      } catch {}
      setDone(true);
    } else {
      setIdx((i) => i + 1);
      setSelected(null);
      setRevealed(false);
    }
  };

  if (loading) {
    return (
      <AppShell>
        <div className="p-10"><div className="flex items-center gap-3 text-white/60"><Loader2 className="w-5 h-5 animate-spin" /> Generating quiz...</div></div>
      </AppShell>
    );
  }

  if (done) {
    const score = answers.filter((a) => a.correct).length;
    const pct = Math.round((score / questions.length) * 100);
    return (
      <AppShell>
        <div className="p-10 max-w-3xl mx-auto">
          <div className="bg-gradient-to-br from-[#4f6ef7]/10 via-[#111118] to-[#00c4cc]/5 border border-white/10 rounded-3xl p-12 text-center">
            <p className="text-xs uppercase tracking-[0.3em] text-[#00c4cc] mb-3">Quiz complete</p>
            <h1 className="font-heading font-extrabold text-6xl mb-2 gradient-text" data-testid="final-score">{pct}%</h1>
            <p className="text-white/60 mb-8">{score} of {questions.length} correct</p>

            {weak.length > 0 && (
              <div className="text-left bg-[#1a1a2a] border border-white/10 rounded-2xl p-6 mb-8">
                <h3 className="font-heading font-bold text-[#f5a623] mb-3">Weak topics</h3>
                <ul className="space-y-2">
                  {weak.map((w, i) => (
                    <li key={i} className="flex items-start gap-2 text-white/70 text-sm">
                      <XCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" /> {w}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex gap-3 justify-center">
              <button onClick={load} data-testid="retake-btn" className="px-6 py-3 rounded-xl bg-[#4f6ef7] text-white hover:shadow-[0_0_24px_rgba(79,110,247,0.5)] transition flex items-center gap-2">
                <RotateCw className="w-4 h-4" /> Retake Quiz
              </button>
              <Link to={`/study-set/${id}`} className="px-6 py-3 rounded-xl border border-white/15 hover:border-white/30 text-white transition">Back to set</Link>
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  if (!q) return <AppShell><div className="p-10 text-white/60">No questions.</div></AppShell>;

  return (
    <AppShell>
      <div className="p-10 max-w-3xl mx-auto">
        <Link to={`/study-set/${id}`} className="inline-flex items-center gap-2 text-white/60 hover:text-white mb-6 text-sm">
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>
        <div className="mb-6">
          <p className="text-xs uppercase tracking-[0.3em] text-[#f5a623] mb-2">Quiz</p>
          <h1 className="font-heading font-extrabold text-3xl">{setTitle}</h1>
        </div>

        {/* Progress */}
        <div className="mb-8 flex items-center gap-4">
          <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-[#4f6ef7] to-[#00c4cc]" style={{ width: `${((idx + 1) / questions.length) * 100}%` }} />
          </div>
          <p className="text-white/60 text-sm font-mono" data-testid="quiz-progress">{idx + 1} / {questions.length}</p>
        </div>

        <div className="bg-[#111118] border border-white/5 rounded-2xl p-8" data-testid="quiz-question-card">
          <p className="text-xs uppercase tracking-[0.3em] text-white/40 mb-3">{q.type === "tf" ? "True / False" : "Multiple Choice"}</p>
          <h2 className="font-heading font-bold text-2xl text-white mb-8">{q.question}</h2>

          <div className="space-y-3">
            {q.options.map((opt) => {
              const isSel = selected === opt;
              const isCorrect = revealed && opt === q.answer;
              const isWrong = revealed && isSel && opt !== q.answer;
              return (
                <button
                  key={opt}
                  onClick={() => !revealed && setSelected(opt)}
                  disabled={revealed}
                  data-testid={`option-${opt}`}
                  className={`w-full text-left px-5 py-4 rounded-xl border transition-all ${
                    isCorrect
                      ? "bg-[#00c4cc]/15 border-[#00c4cc]/50 text-white"
                      : isWrong
                      ? "bg-red-500/15 border-red-500/50 text-white"
                      : isSel
                      ? "bg-[#4f6ef7]/15 border-[#4f6ef7]/50 text-white"
                      : "bg-[#1a1a2a] border-white/10 text-white/80 hover:border-white/30 hover:bg-white/5"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span>{opt}</span>
                    {isCorrect && <CheckCircle2 className="w-5 h-5 text-[#00c4cc]" />}
                    {isWrong && <XCircle className="w-5 h-5 text-red-400" />}
                  </div>
                </button>
              );
            })}
          </div>

          {revealed && (
            <div className="mt-6 p-4 rounded-xl bg-[#1a1a2a] border border-white/10" data-testid="quiz-feedback">
              <p className="text-white/80 text-sm leading-relaxed"><strong className="text-[#00c4cc]">Explanation: </strong>{q.explanation}</p>
            </div>
          )}

          <div className="mt-6 flex justify-end gap-3">
            {!revealed ? (
              <button onClick={submitAnswer} disabled={!selected} data-testid="submit-answer-btn" className="px-6 py-3 rounded-xl bg-[#4f6ef7] text-white hover:shadow-[0_0_24px_rgba(79,110,247,0.5)] disabled:opacity-40 transition">Submit</button>
            ) : (
              <button onClick={nextQ} data-testid="next-q-btn" className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#4f6ef7] to-[#00c4cc] text-white hover:shadow-[0_0_30px_rgba(79,110,247,0.5)] transition">
                {idx + 1 >= questions.length ? "Finish" : "Next Question"}
              </button>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
