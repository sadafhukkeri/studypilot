import { NavLink, useNavigate } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { Home, Library, MessageCircle, Gamepad2, Calendar, Settings, LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const items = [
  { to: "/dashboard", label: "Home", icon: Home, testid: "nav-home" },
  { to: "/study-sets", label: "My Study Sets", icon: Library, testid: "nav-sets" },
  { to: "/sparke", label: "Spark.E Chat", icon: MessageCircle, testid: "nav-sparke" },
  { to: "/arcade", label: "Arcade", icon: Gamepad2, testid: "nav-arcade" },
  { to: "/calendar", label: "Study Calendar", icon: Calendar, testid: "nav-calendar" },
  { to: "/settings", label: "Settings", icon: Settings, testid: "nav-settings" },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <aside
      className="w-64 min-h-screen bg-[#0a0a0f] border-r border-white/5 flex flex-col py-6 px-4 sticky top-0"
      data-testid="sidebar"
    >
      <div className="px-2 mb-10">
        <Logo />
      </div>
      <nav className="flex-1 space-y-1">
        {items.map((it) => (
          <NavLink
            key={it.to}
            to={it.to}
            data-testid={it.testid}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-xl font-body text-sm font-medium transition-all duration-300 ${
                isActive
                  ? "bg-gradient-to-r from-[#4f6ef7]/20 to-[#00c4cc]/10 text-white border border-[#4f6ef7]/30 shadow-[0_0_20px_rgba(79,110,247,0.15)]"
                  : "text-white/60 hover:text-white hover:bg-white/5"
              }`
            }
          >
            <it.icon className="w-4 h-4" />
            {it.label}
          </NavLink>
        ))}
      </nav>

      {user && (
        <div className="border-t border-white/5 pt-4 mt-4">
          <div className="flex items-center gap-3 px-2 mb-3" data-testid="sidebar-user">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#4f6ef7] to-[#00c4cc] flex items-center justify-center text-sm font-bold">
              {user.picture ? (
                <img src={user.picture} alt={user.name} className="w-full h-full rounded-full object-cover" />
              ) : (
                user.name?.[0]?.toUpperCase() || "S"
              )}
            </div>
            <div className="min-w-0">
              <p className="text-white text-sm font-medium truncate">{user.name}</p>
              <p className="text-white/40 text-xs truncate">{user.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            data-testid="logout-btn"
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-white/60 hover:text-white hover:bg-white/5 text-sm transition-all"
          >
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>
      )}
    </aside>
  );
}
