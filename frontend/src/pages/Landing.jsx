import { Link } from "react-router-dom";
import { Logo } from "@/components/Logo";
import {
  Sparkles, FileText, Zap, MessageCircle, Gamepad2, Calendar,
  Star, ArrowRight, CheckCircle2, BookOpen,
} from "lucide-react";

const HERO_IMG =
  "https://static.prod-images.emergentagent.com/jobs/08888170-6c2f-493c-8280-6dacc6606bf6/images/32a5b904ffab926f3f93501f8c44d9d4638cd5285a1077b40d14933b44465178.png";
const MASCOT_IMG =
  "https://static.prod-images.emergentagent.com/jobs/08888170-6c2f-493c-8280-6dacc6606bf6/images/60ac151ee6a23e8e0074f7a4d36e0c2c2734542576ebf15ba7bf57040a877979.png";

const features = [
  { icon: FileText, title: "Notes AI", desc: "Auto-generated structured notes at any depth.", color: "#4f6ef7" },
  { icon: Zap, title: "Flashcards AI", desc: "Spaced-repetition cards that adapt to you.", color: "#00c4cc" },
  { icon: BookOpen, title: "Quizzes", desc: "Personalized quizzes with instant feedback.", color: "#f5a623" },
  { icon: MessageCircle, title: "Spark.E Tutor", desc: "Chat with an AI tutor that knows your material.", color: "#4f6ef7" },
  { icon: Gamepad2, title: "Arcade", desc: "Three game modes that turn study into play.", color: "#00c4cc" },
  { icon: Calendar, title: "Study Calendar", desc: "AI auto-schedules sessions around your exams.", color: "#f5a623" },
];

const testimonials = [
  { name: "Maya R.", role: "Med Student", text: "I went from cramming to confident. Spark.E literally changed how I revise.", stars: 5 },
  { name: "Theo K.", role: "Law Student", text: "Uploaded a 200-page lecture pack and had flashcards in 30 seconds. Insane.", stars: 5 },
  { name: "Aiden P.", role: "CS Major", text: "Arcade mode makes studying actually fun. My grades agree.", stars: 5 },
];

const stats = [
  { value: "6M+", label: "Students" },
  { value: "190+", label: "Countries" },
  { value: "4.8★", label: "App Store" },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white overflow-hidden">
      {/* NAV */}
      <header className="sticky top-0 z-50 border-b border-white/5 bg-[#0a0a0f]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-8 h-16 flex items-center justify-between">
          <Logo />
          <nav className="flex items-center gap-3">
            <Link
              to="/login"
              data-testid="nav-login-btn"
              className="px-5 py-2 text-sm text-white/80 hover:text-white transition"
            >
              Login
            </Link>
            <Link
              to="/signup"
              data-testid="nav-signup-btn"
              className="px-5 py-2.5 text-sm font-medium rounded-xl bg-[#4f6ef7] text-white hover:bg-[#3d59d4] hover:shadow-[0_0_24px_rgba(79,110,247,0.5)] transition-all duration-300"
            >
              Get Started Free
            </Link>
          </nav>
        </div>
      </header>

      {/* HERO */}
      <section className="relative max-w-7xl mx-auto px-8 pt-20 pb-24 grid grid-cols-12 gap-12 items-center">
        <div className="col-span-7 animate-fade-up">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 mb-6 rounded-full bg-white/5 border border-white/10 text-xs font-medium tracking-widest uppercase text-[#00c4cc]">
            <Sparkles className="w-3 h-3" /> Powered by Claude Sonnet 4.5
          </div>
          <h1 className="font-heading font-extrabold text-5xl lg:text-7xl leading-[1.05] tracking-tight mb-6">
            Turn Your Notes <br />Into Study Tools <span className="gradient-text">Instantly</span>
          </h1>
          <p className="font-body text-lg text-white/60 mb-10 max-w-xl leading-relaxed">
            Upload any PDF, slide deck, lecture or YouTube video. Get notes, flashcards, quizzes, and a personal AI tutor in seconds.
          </p>
          <div className="flex items-center gap-4">
            <Link
              to="/signup"
              data-testid="hero-cta-primary"
              className="group px-7 py-3.5 rounded-xl bg-[#4f6ef7] text-white font-medium flex items-center gap-2 hover:shadow-[0_0_30px_rgba(79,110,247,0.55)] hover:bg-[#3d59d4] transition-all duration-300"
            >
              Get Started Free
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
            <a
              href="#features"
              data-testid="hero-cta-secondary"
              className="px-7 py-3.5 rounded-xl border border-white/15 text-white/90 font-medium hover:border-white/40 hover:bg-white/5 transition-all"
            >
              See How It Works
            </a>
          </div>
          <div className="mt-8 flex items-center gap-2 text-sm text-white/50">
            <CheckCircle2 className="w-4 h-4 text-[#00c4cc]" /> No credit card needed · Free forever tier
          </div>
        </div>
        <div className="col-span-5 relative">
          <div className="absolute inset-0 bg-gradient-to-br from-[#4f6ef7]/20 to-[#00c4cc]/10 blur-3xl rounded-full" />
          <img
            src={HERO_IMG}
            alt="StudyAI Hero"
            className="relative w-full rounded-3xl animate-float"
          />
        </div>
      </section>

      {/* STATS BAR */}
      <section className="border-y border-white/5 bg-[#111118]/50 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-8 py-10 grid grid-cols-3 gap-8">
          {stats.map((s) => (
            <div key={s.label} className="text-center" data-testid={`stat-${s.label.toLowerCase()}`}>
              <div className="font-heading font-extrabold text-4xl lg:text-5xl text-[#f5a623] mb-1">{s.value}</div>
              <div className="text-white/50 text-sm tracking-widest uppercase">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="max-w-7xl mx-auto px-8 py-24">
        <div className="text-center mb-16">
          <p className="text-xs uppercase tracking-[0.3em] text-[#00c4cc] mb-3">Everything you need</p>
          <h2 className="font-heading font-extrabold text-4xl lg:text-5xl mb-4">Six tools. One upload.</h2>
          <p className="text-white/60 max-w-2xl mx-auto">From note structure to gamified quizzes — your study set unlocks every tool.</p>
        </div>
        <div className="grid grid-cols-3 gap-6">
          {features.map((f, i) => (
            <div
              key={f.title}
              data-testid={`feature-card-${i}`}
              className="group relative bg-[#111118] border border-white/5 rounded-2xl p-7 hover:-translate-y-1 hover:border-white/20 transition-all duration-500"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center mb-5 transition-all"
                style={{ backgroundColor: `${f.color}1a`, border: `1px solid ${f.color}33` }}
              >
                <f.icon className="w-5 h-5" style={{ color: f.color }} />
              </div>
              <h3 className="font-heading font-bold text-xl mb-2">{f.title}</h3>
              <p className="text-white/60 leading-relaxed text-sm">{f.desc}</p>
              <div
                className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                style={{ boxShadow: `0 0 40px ${f.color}22` }}
              />
            </div>
          ))}
        </div>
      </section>

      {/* MASCOT BAND */}
      <section className="max-w-7xl mx-auto px-8 py-24">
        <div className="grid grid-cols-12 gap-12 items-center">
          <div className="col-span-5 relative">
            <div className="absolute inset-0 bg-gradient-radial from-[#4f6ef7]/30 to-transparent blur-3xl" />
            <img src={MASCOT_IMG} alt="Spark.E mascot" className="relative w-full max-w-sm mx-auto animate-float" />
          </div>
          <div className="col-span-7">
            <p className="text-xs uppercase tracking-[0.3em] text-[#f5a623] mb-3">Meet Spark.E</p>
            <h2 className="font-heading font-extrabold text-4xl lg:text-5xl mb-5 leading-tight">
              An AI tutor that actually knows your notes.
            </h2>
            <p className="text-white/60 text-lg leading-relaxed mb-6 max-w-xl">
              Spark.E reads your uploaded material and answers questions, explains diagrams, even grades your essays — all grounded in your study set.
            </p>
            <ul className="space-y-3 text-white/80">
              <li className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-[#00c4cc]" /> Standard & Ultra Thinking modes</li>
              <li className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-[#00c4cc]" /> Image / diagram analyser</li>
              <li className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-[#00c4cc]" /> Essay grader with structured feedback</li>
            </ul>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="max-w-7xl mx-auto px-8 py-24">
        <div className="text-center mb-14">
          <h2 className="font-heading font-extrabold text-4xl lg:text-5xl mb-3">Loved by students worldwide</h2>
        </div>
        <div className="grid grid-cols-3 gap-6">
          {testimonials.map((t, i) => (
            <div
              key={t.name}
              data-testid={`testimonial-${i}`}
              className="bg-[#111118]/60 backdrop-blur-xl border border-white/10 rounded-2xl p-7 hover:border-[#4f6ef7]/30 transition"
            >
              <div className="flex gap-0.5 mb-4">
                {Array.from({ length: t.stars }).map((_, k) => (
                  <Star key={k} className="w-4 h-4 fill-[#f5a623] text-[#f5a623]" />
                ))}
              </div>
              <p className="text-white/80 leading-relaxed mb-6">"{t.text}"</p>
              <div>
                <p className="font-semibold text-white">{t.name}</p>
                <p className="text-white/50 text-sm">{t.role}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-5xl mx-auto px-8 py-24">
        <div className="relative bg-gradient-to-br from-[#4f6ef7]/20 via-[#111118] to-[#00c4cc]/10 border border-white/10 rounded-3xl p-16 text-center overflow-hidden">
          <div className="absolute inset-0 bg-gradient-radial from-[#4f6ef7]/10 to-transparent" />
          <div className="relative">
            <h2 className="font-heading font-extrabold text-4xl lg:text-5xl mb-5">Start studying smarter today</h2>
            <p className="text-white/60 mb-8 max-w-xl mx-auto">Join millions of students using StudyAI to ace their exams.</p>
            <Link
              to="/signup"
              data-testid="bottom-cta"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-[#4f6ef7] text-white font-medium hover:shadow-[0_0_40px_rgba(79,110,247,0.6)] hover:bg-[#3d59d4] transition-all"
            >
              Get Started Free <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-white/5 py-10">
        <div className="max-w-7xl mx-auto px-8 flex items-center justify-between">
          <Logo size="sm" />
          <p className="text-white/40 text-sm">© 2026 StudyAI · Made for students</p>
          <div className="flex items-center gap-6 text-sm text-white/50">
            <a href="#" className="hover:text-white">Privacy</a>
            <a href="#" className="hover:text-white">Terms</a>
            <a href="#" className="hover:text-white">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
