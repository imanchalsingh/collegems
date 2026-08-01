import { useCallback, useEffect, useState } from "react";
import { CalendarClock, CheckCircle2, Star } from "lucide-react";
import api from "../api/axios";
import { extractArray } from "../utils/apiHelpers";
import MentorAvailabilityPicker from "../components/mentorship/MentorAvailabilityPicker";
import BookingCalendarModal from "../components/mentorship/BookingCalendarModal";

interface BookingRow {
  _id: string;
  startTime: string;
  endTime: string;
  status: string;
  purpose?: string;
  location?: string;
  isOnline?: boolean;
  mentor?: { _id: string; name: string };
  mentee?: { _id: string; name: string };
  rating?: { score?: number; comment?: string };
}

export default function MentorshipSlotBookingHub({ mode }: { mode: "mentor" | "mentee" }) {
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [ratingDraft, setRatingDraft] = useState<Record<string, { score: number; comment: string }>>({});

  const load = useCallback(async () => {
    try {
      setError("");
      const res = await api.get("/mentorship-bookings/my");
      setBookings(extractArray(res.data));
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load bookings");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const cancel = async (id: string) => {
    await api.patch(`/mentorship-bookings/${id}/cancel`);
    load();
  };

  const complete = async (id: string) => {
    await api.patch(`/mentorship-bookings/${id}/complete`);
    load();
  };

  const submitRating = async (id: string) => {
    const draft = ratingDraft[id] || { score: 5, comment: "" };
    await api.post(`/mentorship-bookings/${id}/rating`, draft);
    load();
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="flex items-center gap-2 text-xl font-semibold text-slate-900 dark:text-white">
          <CalendarClock className="h-5 w-5 text-teal-600" />
          {mode === "mentor" ? "Tutoring & Mentorship Hours" : "Book Tutoring / Mentorship"}
        </h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          {mode === "mentor"
            ? "Set weekly availability and manage reserved sessions. Confirmed bookings email .ics invites."
            : "Reserve a slot with your assigned mentor. You’ll receive a calendar (.ics) invite by email."}
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </div>
      )}

      {mode === "mentor" && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
          <MentorAvailabilityPicker />
        </div>
      )}

      {mode === "mentee" && (
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white"
        >
          Open booking calendar
        </button>
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
        <h3 className="mb-3 font-semibold text-slate-900 dark:text-white">My sessions</h3>
        {bookings.length === 0 ? (
          <p className="text-sm text-slate-400">No bookings yet.</p>
        ) : (
          <ul className="space-y-3">
            {bookings.map((b) => (
              <li
                key={b._id}
                className="rounded-lg border border-slate-200 px-3 py-3 text-sm dark:border-slate-700"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white">
                      {new Date(b.startTime).toLocaleString()} –{" "}
                      {new Date(b.endTime).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                    <p className="text-slate-500">
                      {mode === "mentor"
                        ? `Mentee: ${b.mentee?.name || "—"}`
                        : `Mentor: ${b.mentor?.name || "—"}`}{" "}
                      · {b.status}
                      {b.purpose ? ` · ${b.purpose}` : ""}
                    </p>
                    {b.rating?.score && (
                      <p className="mt-1 flex items-center gap-1 text-amber-600">
                        <Star className="h-3.5 w-3.5 fill-current" /> {b.rating.score}/5
                        {b.rating.comment ? ` — ${b.rating.comment}` : ""}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {b.status === "confirmed" && (
                      <button
                        type="button"
                        onClick={() => cancel(b._id)}
                        className="rounded-md border border-slate-300 px-2 py-1 text-xs dark:border-slate-600"
                      >
                        Cancel
                      </button>
                    )}
                    {mode === "mentor" && b.status === "confirmed" && (
                      <button
                        type="button"
                        onClick={() => complete(b._id)}
                        className="inline-flex items-center gap-1 rounded-md bg-slate-900 px-2 py-1 text-xs text-white dark:bg-slate-100 dark:text-slate-900"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" /> Complete
                      </button>
                    )}
                  </div>
                </div>

                {mode === "mentee" && b.status === "completed" && !b.rating?.score && (
                  <div className="mt-3 flex flex-wrap items-end gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
                    <label className="text-xs">
                      Rating
                      <select
                        className="ml-2 rounded border border-slate-300 px-2 py-1 dark:border-slate-600 dark:bg-slate-950"
                        value={ratingDraft[b._id]?.score ?? 5}
                        onChange={(e) =>
                          setRatingDraft((prev) => ({
                            ...prev,
                            [b._id]: {
                              score: Number(e.target.value),
                              comment: prev[b._id]?.comment || "",
                            },
                          }))
                        }
                      >
                        {[5, 4, 3, 2, 1].map((n) => (
                          <option key={n} value={n}>
                            {n}
                          </option>
                        ))}
                      </select>
                    </label>
                    <input
                      placeholder="Feedback (optional)"
                      className="min-w-[12rem] flex-1 rounded border border-slate-300 px-2 py-1 text-xs dark:border-slate-600 dark:bg-slate-950"
                      value={ratingDraft[b._id]?.comment || ""}
                      onChange={(e) =>
                        setRatingDraft((prev) => ({
                          ...prev,
                          [b._id]: {
                            score: prev[b._id]?.score || 5,
                            comment: e.target.value,
                          },
                        }))
                      }
                    />
                    <button
                      type="button"
                      onClick={() => submitRating(b._id)}
                      className="rounded-md bg-teal-700 px-2 py-1 text-xs text-white"
                    >
                      Submit feedback
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <BookingCalendarModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onBooked={() => {
          setModalOpen(false);
          load();
        }}
      />
    </div>
  );
}
