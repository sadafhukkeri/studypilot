import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import AppShell from "@/components/AppShell";
import api from "@/lib/api";
import { ArrowLeft, ChevronLeft, ChevronRight, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export default function FlashcardsPage() {
  const { id } = useParams();
  const [cards, setCards] = useState([]);
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [setTitle, setSetTitle] = useState("");

  useEffect(() => {
    api.get(`/study-sets/${id}`).then(({ data }) => setSetTitle(data.title)).catch(() => {});
  }, [id]);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.post("/flashcards/generate", { study_set_id: id });
      setCards(data.flashcards || []);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed to load flashcards");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  const card = cards[idx];

  const setDifficulty = async (level) => {
    if (!card) return;
    try {
      await api.put(`/flashcards/${card.id}/difficulty`, { difficulty: level });
      toast.success(`Marked as ${level}`);
      next();
    } catch {
      toast.error("Failed to save");
    }
  };

  const next = () => {
    setFlipped(false);
    setIdx((i) => (i + 1) % cards.length);
  };
  const prev = () => {
    setFlipped(false);
    setIdx((i) => (i - 1 + cards.length) % cards.length);
  };

  return (
    <AppShell>
      <div className="p-10 max-w-4xl mx-auto">
        <Link to={`/study-set/${id}`} className="inline-flex items-center gap-2 text-white/60 hover:text-white mb-6 text-sm">
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>
        <div className="mb-6">
          <p className="text-xs uppercase tracking-[0.3em] text-[#00c4cc] mb-2">Flashcards</p>
          <h1 className="font-heading font-extrabold text-4xl">{setTitle}</h1>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-32 text-white/60">
            <Loader2 className="w-6 h-6 animate-spin mr-3" /> Generating flashcards...
          </div>
        ) : cards.length === 0 ? (
          <p className="text-white/60">No cards generated.</p>
        ) : (
          <>
            {/* Progress */}
            <div className="mb-6 flex items-center gap-4">
              <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-[#4f6ef7] to-[#00c4cc] transition-all" style={{ width: `${((idx + 1) / cards.length) * 100}%` }} />
              </div>
              <p className="text-white/60 text-sm font-mono">{idx + 1} / {cards.length}</p>
            </div>

            {/* Card */}
            <div
              className="relative h-80 perspective-1000 cursor-pointer mb-6"
              onClick={() => setFlipped((f) => !f)}
              data-testid="flashcard-flip-area"
            >
              <motion.div
                className="absolute inset-0 preserve-3d"
                animate={{ rotateY: flipped ? 180 : 0 }}
                transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
              >
                <div
                  className="absolute inset-0 backface-hidden bg-[#1a1a2a] border border-white/10 rounded-3xl flex items-center justify-center p-10 shadow-[0_0_40px_rgba(79,110,247,0.15)]"
                  data-testid="flashcard-front"
                >
                  <div className="text-center">
                    <p className="text-xs uppercase tracking-[0.3em] text-[#4f6ef7] mb-4">Term</p>
                    <p className="font-heading font-bold text-3xl text-white">{card?.front}</p>
                    <p className="text-white/40 text-sm mt-8">Click to flip</p>
                  </div>
                </div>
                <div
                  className="absolute inset-0 backface-hidden rotate-y-180 bg-gradient-to-br from-[#4f6ef7]/15 to-[#00c4cc]/10 border border-[#4f6ef7]/30 rounded-3xl flex items-center justify-center p-10 shadow-[0_0_40px_rgba(79,110,247,0.25)]"
                  data-testid="flashcard-back"
                >
                  <div className="text-center">
                    <p className="text-xs uppercase tracking-[0.3em] text-[#00c4cc] mb-4">Definition</p>
                    <p className="text-xl text-white leading-relaxed">{card?.back}</p>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-between gap-4 mb-6">
              <button onClick={prev} data-testid="prev-btn" className="px-5 py-3 rounded-xl bg-[#1a1a2a] border border-white/10 hover:border-white/30 transition text-white flex items-center gap-2">
                <ChevronLeft className="w-4 h-4" /> Previous
              </button>
              <button onClick={() => setFlipped((f) => !f)} data-testid="flip-btn" className="px-5 py-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition text-white flex items-center gap-2">
                <RefreshCw className="w-4 h-4" /> Flip
              </button>
              <button onClick={next} data-testid="next-btn" className="px-5 py-3 rounded-xl bg-[#1a1a2a] border border-white/10 hover:border-white/30 transition text-white flex items-center gap-2">
                Next <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Difficulty */}
            <div className="grid grid-cols-3 gap-3" data-testid="difficulty-controls">
              <button onClick={() => setDifficulty("again")} data-testid="diff-again" className="py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition">Again</button>
              <button onClick={() => setDifficulty("hard")} data-testid="diff-hard" className="py-3 rounded-xl bg-[#f5a623]/10 border border-[#f5a623]/30 text-[#f5a623] hover:bg-[#f5a623]/20 transition">Hard</button>
              <button onClick={() => setDifficulty("easy")} data-testid="diff-easy" className="py-3 rounded-xl bg-[#00c4cc]/10 border border-[#00c4cc]/30 text-[#00c4cc] hover:bg-[#00c4cc]/20 transition">Easy</button>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
