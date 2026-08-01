import { useEffect, useMemo, useState } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import { Loader2, X } from "lucide-react";
import api from "../../api/axios";

interface SlotWindow {
  startTime: string;
  endTime: string;
  location: string;
  isOnline: boolean;
}

interface MentorOption {
  mentorshipId: string;
  mentor: { _id: string; name: string; email?: string; role?: string };
  hasAvailability: boolean;
}

interface BookingCalendarModalProps {
  open: boolean;
  onClose: () => void;
  onBooked?: () => void;
  mentorId?: string;
  mentorName?: string;
}

export default function BookingCalendarModal({
  open,
  onClose,
  onBooked,
  mentorId: fixedMentorId,
  mentorName,
}: BookingCalendarModalProps) {
  const [mentors, setMentors] = useState<MentorOption[]>([]);
  const [mentorId, setMentorId] = useState(fixedMentorId || "");
  const [selectedDay, setSelectedDay] = useState<Date>(new Date());
  const [slots, setSlots] = useState<SlotWindow[]>([]);
  const [loading, setLoading] = useState(false);
  const [booking, setBooking] = useState(false);
  const [purpose, setPurpose] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (!open) return;
    if (fixedMentorId) {
      setMentorId(fixedMentorId);
      return;
    }
    (async () => {
      try {
        const res = await api.get("/mentorship-bookings/mentors");
        setMentors(Array.isArray(res.data) ? res.data : []);
        if (res.data?.[0]?.mentor?._id) setMentorId(res.data[0].mentor._id);
      } catch (err: any) {
        setError(err.response?.data?.message || "Failed to load mentors");
      }
    })();
  }, [open, fixedMentorId]);

  const range = useMemo(() => {
    const from = new Date(selectedDay);
    from.setHours(0, 0, 0, 0);
    const to = new Date(selectedDay);
    to.setHours(23, 59, 59, 999);
    return { from, to };
  }, [selectedDay]);

  useEffect(() => {
    if (!open || !mentorId) return;
    (async () => {
      try {
        setLoading(true);
        setError("");
        const res = await api.get("/mentorship-bookings/slots", {
          params: {
            mentorId,
            from: range.from.toISOString(),
            to: range.to.toISOString(),
          },
        });
        setSlots(res.data.slots || []);
      } catch (err: any) {
        setError(err.response?.data?.message || "Failed to load slots");
        setSlots([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [open, mentorId, range.from, range.to]);

  const book = async (slot: SlotWindow) => {
    try {
      setBooking(true);
      setError("");
      setSuccess("");
      await api.post("/mentorship-bookings", {
        mentorId,
        startTime: slot.startTime,
        endTime: slot.endTime,
        purpose,
        location: slot.location,
        isOnline: slot.isOnline,
      });
      setSuccess("Booked! Check email for the .ics calendar invite.");
      onBooked?.();
    } catch (err: any) {
      setError(err.response?.data?.message || "Booking failed");
    } finally {
      setBooking(false);
    }
  };

  if (!open) return null;

  const displayName =
    mentorName ||
    mentors.find((m) => m.mentor._id === mentorId)?.mentor.name ||
    "Mentor";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-white p-4 shadow-xl dark:bg-slate-900">
        <div className="mb-3 flex items-start justify-between gap-2">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              Book a session
            </h3>
            <p className="text-sm text-slate-500">with {displayName}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-md p-1 hover:bg-slate-100 dark:hover:bg-slate-800">
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mb-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            {success}
          </div>
        )}

        {!fixedMentorId && (
          <label className="mb-3 block text-sm">
            Mentor
            <select
              value={mentorId}
              onChange={(e) => setMentorId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 dark:border-slate-600 dark:bg-slate-950"
            >
              {mentors.map((m) => (
                <option key={m.mentor._id} value={m.mentor._id}>
                  {m.mentor.name}
                  {!m.hasAvailability ? " (no hours yet)" : ""}
                </option>
              ))}
            </select>
          </label>
        )}

        <label className="mb-3 block text-sm">
          Session purpose
          <input
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            placeholder="e.g. Help with DSA recursion"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 dark:border-slate-600 dark:bg-slate-950"
          />
        </label>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="mentorship-cal rounded-lg border border-slate-200 p-2 dark:border-slate-700">
            <Calendar
              onChange={(value) => {
                const d = Array.isArray(value) ? value[0] : value;
                if (d instanceof Date) setSelectedDay(d);
              }}
              value={selectedDay}
              minDate={new Date()}
            />
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-200">
              Open slots — {selectedDay.toLocaleDateString()}
            </p>
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading…
              </div>
            ) : slots.length === 0 ? (
              <p className="text-sm text-slate-400">No open slots on this day.</p>
            ) : (
              <ul className="max-h-72 space-y-2 overflow-y-auto">
                {slots.map((slot) => (
                  <li
                    key={slot.startTime}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700"
                  >
                    <span>
                      {new Date(slot.startTime).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}{" "}
                      –{" "}
                      {new Date(slot.endTime).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      <span className="ml-2 text-xs text-slate-500">
                        {slot.isOnline ? "Online" : slot.location || "On campus"}
                      </span>
                    </span>
                    <button
                      type="button"
                      disabled={booking}
                      onClick={() => book(slot)}
                      className="rounded-md bg-teal-700 px-3 py-1 text-xs font-medium text-white disabled:opacity-50"
                    >
                      Reserve
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
