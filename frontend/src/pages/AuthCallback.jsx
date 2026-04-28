import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

export default function AuthCallback() {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const hasProcessed = useRef(false);

  useEffect(() => {
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const hash = window.location.hash || "";
    const match = hash.match(/session_id=([^&]+)/);
    if (!match) {
      navigate("/login");
      return;
    }
    const sessionId = match[1];
    (async () => {
      try {
        const { data } = await api.post("/auth/google-session", { session_id: sessionId });
        setUser(data.user);
        // Clear hash and navigate
        window.history.replaceState({}, document.title, window.location.pathname);
        navigate("/dashboard", { state: { user: data.user } });
      } catch {
        navigate("/login");
      }
    })();
  }, [navigate, setUser]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f]">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-[#4f6ef7] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-white/70 font-body">Signing you in...</p>
      </div>
    </div>
  );
}
