import Sidebar from "@/components/Sidebar";

export default function AppShell({ children }) {
  return (
    <div className="flex bg-[#0a0a0f] min-h-screen text-white">
      <Sidebar />
      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}
