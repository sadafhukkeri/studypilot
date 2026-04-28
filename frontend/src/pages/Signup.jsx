import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Logo } from "@/components/Logo";
import { CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export default function Signup() {
  const { signupEmail } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const handleGoogle = () => {
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    const redirectUrl = window.location.origin + "/dashboard";
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  const submit = async (e) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    setBusy(true);
    try {
      await signupEmail(email, password, name);
      toast.success("Account created! Welcome to StudyPilot");
      navigate("/dashboard");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Signup failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen grid grid-cols-2 bg-[#0a0a0f]">
      <div className="relative hidden lg:flex items-center justify-center bg-gradient-to-br from-[#00c4cc]/15 via-[#0a0a0f] to-[#4f6ef7]/15 p-12">
        <div className="relative max-w-md">
          <Logo size="lg" />
          <h2 className="font-heading font-extrabold text-4xl mt-10 leading-tight">
            Start studying <span className="gradient-text">smarter</span>, not harder.
          </h2>
          <p className="text-white/60 mt-5 leading-relaxed">
            Upload one document. Get notes, flashcards, quizzes, and an AI tutor — for free.
          </p>
          <ul className="mt-8 space-y-3 text-white/80">
            <li className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-[#00c4cc]" /> Forever-free starter plan</li>
            <li className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-[#00c4cc]" /> No credit card needed</li>
            <li className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-[#00c4cc]" /> Powered by Claude Sonnet 4.5</li>
          </ul>
        </div>
      </div>

      <div className="flex items-center justify-center p-12 col-span-2 lg:col-span-1">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-8"><Logo /></div>
          <div className="inline-flex items-center gap-2 px-3 py-1 mb-3 rounded-full bg-[#00c4cc]/10 border border-[#00c4cc]/30 text-[#00c4cc] text-xs">
            <CheckCircle2 className="w-3 h-3" /> No credit card needed
          </div>
          <h1 className="font-heading font-extrabold text-3xl mb-2 text-white">Create account</h1>
          <p className="text-white/60 mb-8">Get started in under 30 seconds</p>

          <button
            type="button"
            onClick={handleGoogle}
            data-testid="google-signup-btn"
            className="w-full flex items-center justify-center gap-3 py-3 rounded-xl bg-white text-[#0a0a0f] font-medium hover:bg-white/90 transition mb-4"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09A6.96 6.96 0 015.5 12c0-.72.13-1.42.34-2.09V7.07H2.18A11 11 0 001 12c0 1.78.43 3.46 1.18 4.93l3.66-2.84z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
            </svg>
            Sign up with Google
          </button>

          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-white/40 text-xs uppercase tracking-widest">or</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="text-sm text-white/70 mb-1.5 block">Full name</label>
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                data-testid="name-input"
                placeholder="Your name"
                className="w-full px-4 py-3 rounded-xl bg-[#1a1a2a] border border-white/10 text-white placeholder:text-white/30 focus:border-[#4f6ef7] focus:outline-none focus:ring-2 focus:ring-[#4f6ef7]/30 transition"
              />
            </div>
            <div>
              <label className="text-sm text-white/70 mb-1.5 block">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                data-testid="email-input"
                placeholder="you@example.com"
                className="w-full px-4 py-3 rounded-xl bg-[#1a1a2a] border border-white/10 text-white placeholder:text-white/30 focus:border-[#4f6ef7] focus:outline-none focus:ring-2 focus:ring-[#4f6ef7]/30 transition"
              />
            </div>
            <div>
              <label className="text-sm text-white/70 mb-1.5 block">Password</label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                data-testid="password-input"
                placeholder="At least 6 characters"
                className="w-full px-4 py-3 rounded-xl bg-[#1a1a2a] border border-white/10 text-white placeholder:text-white/30 focus:border-[#4f6ef7] focus:outline-none focus:ring-2 focus:ring-[#4f6ef7]/30 transition"
              />
            </div>
            <button
              type="submit"
              disabled={busy}
              data-testid="submit-signup-btn"
              className="w-full py-3 rounded-xl bg-[#4f6ef7] text-white font-medium hover:shadow-[0_0_24px_rgba(79,110,247,0.55)] hover:bg-[#3d59d4] transition disabled:opacity-50"
            >
              {busy ? "Creating account..." : "Create Account"}
            </button>
          </form>

          <p className="text-center text-white/50 text-sm mt-6">
            Already have an account?{" "}
            <Link to="/login" data-testid="link-login" className="text-[#4f6ef7] hover:underline">Log in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
