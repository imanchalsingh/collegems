import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  Loader2,
  NotebookPen,
  Video,
  XCircle,
} from "lucide-react";
import api from "../api/axios";
import { extractArray } from "../utils/apiHelpers";

interface TeacherOption {
  _id: string;
  name: string;
  email: string;
  department?: string;
}

interface PTMBooking {
  _id: string;
  scheduledAt: string;
  durationMinutes: number;
  reason: string;
  status: "pending" | "approved" | "rejected" | "completed" | "cancelled";
  meetingUrl?: string;
  meetingRoomId?: string;
  teacherNotes?: string;
  actionItems?: { text: string; done: boolean }[];
  rejectionReason?: string;
  teacher?: { _id: string; name: string; email?: string; department?: string };
  parent?: { _id: string; name: string; email?: string };
  student?: { _id: string; name: string; studentId?: string };
}

const statusClass: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  approved: "bg-emerald-100 text-emerald-800",
  rejected: "bg-red-100 text-red-800",
  completed: "bg-slate-100 text-slate-700",
  cancelled: "bg-slate-100 text-slate-500",
};

export default function ParentTeacherMeetingHub() {
  const navigate = useNavigate();
  const role = localStorage.getItem("role") || "";
  const isParent = role === "parent";
  const isTeacher = role === "teacher" || role === "hod";

  const [teachers, setTeachers] = useState<TeacherOption[]>([]);
  const [bookings, setBookings] = useState<PTMBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [activeRoom, setActiveRoom] = useState<PTMBooking | null>(null);

  const [form, setForm] = useState({
    teacherId: "",
    scheduledAt: "",
    durationMinutes: "30",
    reason: "",
  });

  const [notesDraft, setNotesDraft] = useState<Record<string, string>>({});
  const [actionDraft, setActionDraft] = useState<Record<string, string>>({});

  const backPath = useMemo(() => {
    if (role === "teacher") return "/teacher/dashboard";
    if (role === "hod") return "/hod/dashboard";
    return "/parent/dashboard";
  }, [role]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");
      const mine = await api.get("/ptm/mine");
      setBookings(extractArray(mine.data));

      if (isParent) {
        const teachersRes = await api.get("/ptm/teachers");
        setTeachers(extractArray(teachersRes.data));
      }
    } catch (err) {
      console.error(err);
      setError("Failed to load PTM data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError("");
      setSuccess("");
      await api.post("/ptm", {
        teacherId: form.teacherId,
        scheduledAt: new Date(form.scheduledAt).toISOString(),
        durationMinutes: Number(form.durationMinutes),
        reason: form.reason,
      });
      setSuccess("Meeting request sent. Waiting for teacher approval.");
      setForm({
        teacherId: "",
        scheduledAt: "",
        durationMinutes: "30",
        reason: "",
      });
      await loadData();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Failed to create meeting request.";
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const handleStatus = async (
    id: string,
    status: string,
    rejectionReason?: string
  ) => {
    try {
      setError("");
      setSuccess("");
      await api.patch(`/ptm/${id}/status`, { status, rejectionReason });
      setSuccess(`Meeting marked as ${status}.`);
      await loadData();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Failed to update meeting status.";
      setError(message);
    }
  };

  const handleSaveNotes = async (booking: PTMBooking) => {
    try {
      const text = notesDraft[booking._id] ?? booking.teacherNotes ?? "";
      const newItem = (actionDraft[booking._id] || "").trim();
      const actionItems = [...(booking.actionItems || [])];
      if (newItem) actionItems.push({ text: newItem, done: false });

      await api.patch(`/ptm/${booking._id}/notes`, {
        teacherNotes: text,
        actionItems,
      });
      setActionDraft((prev) => ({ ...prev, [booking._id]: "" }));
      setSuccess("Meeting notes saved.");
      await loadData();
    } catch (err) {
      setError("Failed to save notes.");
    }
  };

  const openRoom = async (booking: PTMBooking) => {
    try {
      const res = await api.get(`/ptm/${booking._id}/room`);
      setActiveRoom({
        ...booking,
        meetingUrl: res.data.data.meetingUrl,
        meetingRoomId: res.data.data.meetingRoomId,
      });
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Meeting room is not available yet.";
      setError(message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Loader2 className="animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => navigate(backPath)}
            className="inline-flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 hover:text-indigo-700"
          >
            <ArrowLeft size={16} />
            Back
          </button>
          <div className="inline-flex items-center gap-2 text-indigo-800 dark:text-indigo-300">
            <Video size={18} />
            <span className="font-medium">Parent-Teacher Meeting Hub</span>
          </div>
        </div>

        <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
          <h1 className="text-xl font-semibold">
            Video Consultation Scheduling
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Request, approve, and join secure Jitsi video rooms for Parent-Teacher
            meetings. Reminders are emailed 15 minutes before approved sessions.
          </p>
        </section>

        {(error || success) && (
          <p
            className={`text-sm rounded-xl px-3 py-2 border ${
              error
                ? "text-red-700 bg-red-50 border-red-200"
                : "text-emerald-700 bg-emerald-50 border-emerald-200"
            }`}
          >
            {error || success}
          </p>
        )}

        {isParent && (
          <form
            onSubmit={handleRequest}
            className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 grid md:grid-cols-2 gap-3"
          >
            <h2 className="md:col-span-2 font-semibold flex items-center gap-2">
              <CalendarClock size={16} />
              Request a meeting
            </h2>
            <label className="text-sm md:col-span-2">
              Select teacher
              <select
                required
                value={form.teacherId}
                onChange={(e) => setForm({ ...form, teacherId: e.target.value })}
                className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2"
              >
                <option value="">Choose a teacher</option>
                {teachers.map((t) => (
                  <option key={t._id} value={t._id}>
                    {t.name}
                    {t.department ? ` — ${t.department}` : ""}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              Date & time
              <input
                required
                type="datetime-local"
                value={form.scheduledAt}
                onChange={(e) =>
                  setForm({ ...form, scheduledAt: e.target.value })
                }
                className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2"
              />
            </label>
            <label className="text-sm">
              Duration (minutes)
              <select
                value={form.durationMinutes}
                onChange={(e) =>
                  setForm({ ...form, durationMinutes: e.target.value })
                }
                className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2"
              >
                <option value="15">15</option>
                <option value="30">30</option>
                <option value="45">45</option>
                <option value="60">60</option>
              </select>
            </label>
            <label className="text-sm md:col-span-2">
              Reason for consultation
              <textarea
                required
                value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
                className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 min-h-[90px]"
                placeholder="e.g. Discuss mid-term performance and study plan"
              />
            </label>
            <button
              type="submit"
              disabled={saving}
              className="md:col-span-2 inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white py-2.5"
            >
              {saving ? <Loader2 className="animate-spin" size={16} /> : <Video size={16} />}
              Submit PTM Request
            </button>
          </form>
        )}

        <section className="space-y-3">
          <h2 className="font-semibold">
            {isTeacher ? "Incoming & scheduled PTMs" : "Your PTM requests"}
          </h2>
          {bookings.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 p-8 text-center text-slate-500">
              No meetings yet.
            </div>
          ) : (
            bookings.map((booking) => (
              <article
                key={booking._id}
                className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold">
                      {isParent
                        ? booking.teacher?.name
                        : `${booking.parent?.name} · ${booking.student?.name || "Student"}`}
                    </h3>
                    <p className="text-sm text-slate-500 mt-1">
                      {new Date(booking.scheduledAt).toLocaleString()} ·{" "}
                      {booking.durationMinutes} min
                    </p>
                    <p className="text-sm mt-2">{booking.reason}</p>
                  </div>
                  <span
                    className={`text-xs px-2 py-1 rounded-full capitalize ${
                      statusClass[booking.status]
                    }`}
                  >
                    {booking.status}
                  </span>
                </div>

                {booking.rejectionReason && (
                  <p className="text-sm text-red-600">
                    Rejection: {booking.rejectionReason}
                  </p>
                )}

                <div className="flex flex-wrap gap-2">
                  {booking.status === "approved" && (
                    <button
                      type="button"
                      onClick={() => openRoom(booking)}
                      className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 text-sm"
                    >
                      <Video size={14} />
                      Join Video Room
                    </button>
                  )}

                  {isTeacher && booking.status === "pending" && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleStatus(booking._id, "approved")}
                        className="inline-flex items-center gap-1 rounded-xl border border-emerald-300 text-emerald-700 px-3 py-2 text-sm"
                      >
                        <CheckCircle2 size={14} />
                        Approve
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          handleStatus(
                            booking._id,
                            "rejected",
                            "Teacher unavailable at requested slot"
                          )
                        }
                        className="inline-flex items-center gap-1 rounded-xl border border-red-300 text-red-700 px-3 py-2 text-sm"
                      >
                        <XCircle size={14} />
                        Reject
                      </button>
                    </>
                  )}

                  {(isParent || isTeacher) &&
                    ["pending", "approved"].includes(booking.status) && (
                      <button
                        type="button"
                        onClick={() => handleStatus(booking._id, "cancelled")}
                        className="rounded-xl border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm"
                      >
                        Cancel
                      </button>
                    )}

                  {isTeacher &&
                    ["approved", "completed"].includes(booking.status) && (
                      <button
                        type="button"
                        onClick={() => handleStatus(booking._id, "completed")}
                        className="rounded-xl border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm"
                      >
                        Mark Completed
                      </button>
                    )}
                </div>

                {isTeacher &&
                  ["approved", "completed"].includes(booking.status) && (
                    <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3 space-y-2">
                      <h4 className="text-sm font-semibold flex items-center gap-2">
                        <NotebookPen size={14} />
                        Meeting notes & action items
                      </h4>
                      <textarea
                        value={
                          notesDraft[booking._id] ?? booking.teacherNotes ?? ""
                        }
                        onChange={(e) =>
                          setNotesDraft((prev) => ({
                            ...prev,
                            [booking._id]: e.target.value,
                          }))
                        }
                        className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm min-h-[80px]"
                        placeholder="Discussion summary..."
                      />
                      <ul className="text-sm space-y-1">
                        {(booking.actionItems || []).map((item, idx) => (
                          <li key={`${booking._id}-ai-${idx}`}>
                            • {item.text}
                            {item.done ? " (done)" : ""}
                          </li>
                        ))}
                      </ul>
                      <input
                        value={actionDraft[booking._id] || ""}
                        onChange={(e) =>
                          setActionDraft((prev) => ({
                            ...prev,
                            [booking._id]: e.target.value,
                          }))
                        }
                        className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm"
                        placeholder="Add action item"
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveNotes(booking)}
                        className="rounded-xl bg-slate-900 dark:bg-indigo-600 text-white px-3 py-2 text-sm"
                      >
                        Save Notes
                      </button>
                    </div>
                  )}

                {!isTeacher && booking.teacherNotes && (
                  <div className="rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-3 text-sm">
                    <p className="font-medium mb-1">Teacher notes</p>
                    <p>{booking.teacherNotes}</p>
                    {(booking.actionItems || []).length > 0 && (
                      <ul className="mt-2 space-y-1">
                        {booking.actionItems!.map((item, idx) => (
                          <li key={`${booking._id}-pai-${idx}`}>• {item.text}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </article>
            ))
          )}
        </section>

        {activeRoom && (
          <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-5xl overflow-hidden shadow-2xl">
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800">
                <div>
                  <h3 className="font-semibold">Live PTM Video Room</h3>
                  <p className="text-xs text-slate-500">
                    Room {activeRoom.meetingRoomId}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveRoom(null)}
                  className="rounded-lg px-3 py-1.5 border border-slate-300 dark:border-slate-700 text-sm"
                >
                  Close
                </button>
              </div>
              <iframe
                title="Parent Teacher Meeting Video"
                src={activeRoom.meetingUrl}
                allow="camera; microphone; fullscreen; display-capture; autoplay"
                className="w-full h-[70vh] bg-black"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
