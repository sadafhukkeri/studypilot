import AppShell from "@/components/AppShell";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { LogOut, User, Mail, Shield } from "lucide-react";

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <AppShell>
      <div className="p-10 max-w-3xl">
        <p className="text-xs uppercase tracking-[0.3em] text-[#00c4cc] mb-2">Settings</p>
        <h1 className="font-heading font-extrabold text-4xl mb-8">Account</h1>

        <div className="bg-[#111118] border border-white/5 rounded-2xl p-8 space-y-6">
          <div className="flex items-center gap-4 pb-6 border-b border-white/5">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#4f6ef7] to-[#00c4cc] flex items-center justify-center text-2xl font-bold">
              {user?.picture ? <img src={user.picture} className="w-full h-full rounded-full object-cover" alt="" /> : (user?.name?.[0]?.toUpperCase() || "S")}
            </div>
            <div>
              <h3 className="font-heading font-bold text-xl">{user?.name}</h3>
              <p className="text-white/60 text-sm">{user?.email}</p>
            </div>
          </div>

          <div className="space-y-4">
            <Field icon={User} label="Name" value={user?.name} />
            <Field icon={Mail} label="Email" value={user?.email} />
            <Field icon={Shield} label="Auth provider" value={user?.auth_provider === "google" ? "Google OAuth" : "Email & password"} />
          </div>

          <div className="pt-6 border-t border-white/5">
            <button
              onClick={handleLogout}
              data-testid="settings-logout-btn"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition"
            >
              <LogOut className="w-4 h-4" /> Sign out
            </button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function Field({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-4 px-4 py-3 rounded-xl bg-[#1a1a2a]">
      <Icon className="w-5 h-5 text-[#4f6ef7] mt-0.5" />
      <div>
        <p className="text-white/50 text-xs uppercase tracking-widest mb-0.5">{label}</p>
        <p className="text-white">{value || "—"}</p>
      </div>
    </div>
  );
}
