import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import api from "@/lib/api";
import { Plus, Trash2, Loader2, Calendar as CalIcon } from "lucide-react";
import { toast } from "sonner";

const SUBJECT_COLORS = ["#4f6ef7", "#00c4cc", "#f5a623", "#ec4899", "#a78bfa", "#22c55e"];

function colorForSubject(subject) {
  let h = 0;
  for (let i = 0; i < subject.length; i++) h = (h * 31 + subject.charCodeAt(i)) >>> 0;
  return SUBJECT_COLORS[h % SUBJECT_COLORS.length];
}

export default function CalendarPage() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [events, setEvents] = useState([]);
  const [studySets, setStudySets] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [examDate, setExamDate] = useState("");
  const [subject, setSubject] = useState("");
  const [title, setTitle] = useState("Final Exam");
  const [setId, setSetId] = useState("");
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState(null);

  const load = () => {
    api.get("/calendar/events").then(({ data }) => setEvents(data));
    api.get("/study-sets").then(({ data }) => setStudySets(data));
  };
  useEffect(() => { load(); }, []);

  const firstDay = new Date(year, month, 1);
  const startWeekday = firstDay.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const grid = [];
  for (let i = 0; i < startWeekday; i++) grid.push(null);
  for (let d = 1; d <= daysInMonth; d++) grid.push(d);
  while (grid.length % 7 !== 0) grid.push(null);

  const eventsByDate = events.reduce((acc, e) => {
    (acc[e.date] = acc[e.date] || []).push(e);
    return acc;
  }, {});

  const monthLabel = new Date(year, month, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const navMonth = (delta) => {
    const d = new Date(year, month + delta, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth());
  };

  const schedule = async () => {
    if (!subject || !examDate) return toast.error("Subject and date required");
    setBusy(true);
    try {
      const { data } = await api.post("/calendar/schedule", { subject, exam_date: examDate, title, study_set_id: setId || undefined });
      setEvents(data.events);
      toast.success("Study plan generated!");
      setShowModal(false);
      setSubject(""); setExamDate(""); setSetId("");
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (eventId) => {
    try {
      await api.delete(`/calendar/events/${eventId}`);
      setEvents((e) => e.filter((ev) => ev.id !== eventId));
      setSelected(null);
    } catch {}
  };

  return (
    <AppShell>
      <div className="p-10 max-w-7xl">
        <div className="flex items-end justify-between mb-8">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-[#00c4cc] mb-2">Calendar</p>
            <h1 className="font-heading font-extrabold text-4xl">Study Calendar</h1>
            <p className="text-white/60 mt-2">AI auto-schedules study sessions backwards from your exam dates.</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            data-testid="add-exam-btn"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#4f6ef7] text-white hover:shadow-[0_0_24px_rgba(79,110,247,0.5)] transition"
          >
            <Plus className="w-4 h-4" /> Add Exam Date
          </button>
        </div>

        {/* Month nav */}
        <div className="flex items-center justify-between mb-5">
          <button onClick={() => navMonth(-1)} className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white hover:bg-white/10 transition" data-testid="prev-month">‹ Prev</button>
          <h2 className="font-heading font-bold text-2xl">{monthLabel}</h2>
          <button onClick={() => navMonth(1)} className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white hover:bg-white/10 transition" data-testid="next-month">Next ›</button>
        </div>

        {/* Grid */}
        <div className="bg-[#111118] border border-white/5 rounded-2xl overflow-hidden">
          <div className="grid grid-cols-7 border-b border-white/5">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div key={d} className="px-3 py-3 text-xs uppercase tracking-widest text-white/40 text-center">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7" data-testid="calendar-grid">
            {grid.map((d, i) => {
              const dateStr = d ? `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}` : "";
              const dayEvents = eventsByDate[dateStr] || [];
              const isToday = d === today.getDate() && month === today.getMonth() && year === today.getFullYear();
              return (
                <div
                  key={i}
                  className={`min-h-[110px] border-r border-b border-white/5 p-2 ${d ? "" : "bg-white/[0.01]"}`}
                  data-testid={d ? `cal-day-${dateStr}` : undefined}
                >
                  {d && (
                    <>
                      <div className={`text-sm mb-2 ${isToday ? "text-[#4f6ef7] font-bold" : "text-white/60"}`}>{d}</div>
                      <div className="space-y-1">
                        {dayEvents.slice(0, 3).map((e) => (
                          <button
                            key={e.id}
                            onClick={() => setSelected(e)}
                            data-testid={`cal-event-${e.id}`}
                            className="w-full text-left text-xs px-2 py-1 rounded truncate hover:opacity-80 transition"
                            style={{ backgroundColor: `${colorForSubject(e.subject)}1a`, color: colorForSubject(e.subject), border: `1px solid ${colorForSubject(e.subject)}40` }}
                          >
                            {e.type === "exam" && "📌 "}{e.title}
                          </button>
                        ))}
                        {dayEvents.length > 3 && <p className="text-xs text-white/40">+{dayEvents.length - 3} more</p>}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Add Exam modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center" onClick={() => setShowModal(false)}>
            <div onClick={(e) => e.stopPropagation()} className="bg-[#111118] border border-white/10 rounded-2xl p-8 w-full max-w-md" data-testid="exam-modal">
              <h3 className="font-heading font-bold text-2xl mb-2">Schedule study plan</h3>
              <p className="text-white/60 text-sm mb-6">Spark.E will create study sessions backwards from the exam date.</p>
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-white/70 mb-1.5 block">Subject *</label>
                  <input value={subject} onChange={(e) => setSubject(e.target.value)} data-testid="modal-subject" placeholder="e.g. Biology, History" className="w-full px-4 py-3 rounded-xl bg-[#1a1a2a] border border-white/10 text-white focus:border-[#4f6ef7] focus:outline-none" />
                </div>
                <div>
                  <label className="text-sm text-white/70 mb-1.5 block">Exam date *</label>
                  <input type="date" value={examDate} onChange={(e) => setExamDate(e.target.value)} data-testid="modal-date" className="w-full px-4 py-3 rounded-xl bg-[#1a1a2a] border border-white/10 text-white focus:border-[#4f6ef7] focus:outline-none" />
                </div>
                <div>
                  <label className="text-sm text-white/70 mb-1.5 block">Title</label>
                  <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-[#1a1a2a] border border-white/10 text-white focus:border-[#4f6ef7] focus:outline-none" />
                </div>
                <div>
                  <label className="text-sm text-white/70 mb-1.5 block">Linked study set (optional)</label>
                  <select value={setId} onChange={(e) => setSetId(e.target.value)} data-testid="modal-set" className="w-full px-4 py-3 rounded-xl bg-[#1a1a2a] border border-white/10 text-white focus:border-[#4f6ef7] focus:outline-none">
                    <option value="">— None —</option>
                    {studySets.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setShowModal(false)} className="flex-1 px-5 py-3 rounded-xl bg-white/5 border border-white/10 text-white hover:bg-white/10 transition">Cancel</button>
                <button onClick={schedule} disabled={busy} data-testid="modal-schedule-btn" className="flex-1 px-5 py-3 rounded-xl bg-[#4f6ef7] text-white hover:shadow-[0_0_24px_rgba(79,110,247,0.5)] disabled:opacity-50 transition flex items-center justify-center gap-2">
                  {busy && <Loader2 className="w-4 h-4 animate-spin" />} Schedule
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Event detail */}
        {selected && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center" onClick={() => setSelected(null)}>
            <div onClick={(e) => e.stopPropagation()} className="bg-[#111118] border border-white/10 rounded-2xl p-8 w-full max-w-md" data-testid="event-modal">
              <CalIcon className="w-8 h-8 mb-3" style={{ color: colorForSubject(selected.subject) }} />
              <h3 className="font-heading font-bold text-2xl mb-1">{selected.title}</h3>
              <p className="text-white/60 mb-4">{selected.subject} · {selected.date}</p>
              {selected.topic && <p className="text-white/80 mb-2"><span className="text-white/50 text-sm">Topic: </span>{selected.topic}</p>}
              <p className="text-white/80 mb-4"><span className="text-white/50 text-sm">Duration: </span>{selected.duration_mins} mins</p>
              <p className="text-white/80 mb-6"><span className="text-white/50 text-sm">Type: </span><span className="capitalize">{selected.type}</span></p>
              <div className="flex gap-3">
                <button onClick={() => setSelected(null)} className="flex-1 px-5 py-3 rounded-xl bg-white/5 border border-white/10 text-white hover:bg-white/10 transition">Close</button>
                <button onClick={() => remove(selected.id)} data-testid="delete-event-btn" className="flex-1 px-5 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition flex items-center justify-center gap-2">
                  <Trash2 className="w-4 h-4" /> Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
