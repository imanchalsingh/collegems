import { useEffect, useState } from "react";
import { Loader2, Plus, Save, Trash2 } from "lucide-react";
import api from "../../api/axios";

const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

interface WeeklySlot {
  day: string;
  startTime: string;
  endTime: string;
  location: string;
  isOnline: boolean;
}

const emptySlot = (): WeeklySlot => ({
  day: "Monday",
  startTime: "10:00",
  endTime: "12:00",
  location: "",
  isOnline: false,
});

export default function MentorAvailabilityPicker() {
  const [slots, setSlots] = useState<WeeklySlot[]>([]);
  const [slotDurationMin, setSlotDurationMin] = useState(30);
  const [notes, setNotes] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await api.get("/mentorship-bookings/availability/my");
        const data = res.data;
        setSlots(Array.isArray(data.slots) ? data.slots : []);
        setSlotDurationMin(data.slotDurationMin || 30);
        setNotes(data.notes || "");
        setIsActive(data.isActive !== false);
      } catch (err: any) {
        setError(err.response?.data?.message || "Failed to load availability");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const updateSlot = (index: number, patch: Partial<WeeklySlot>) => {
    setSlots((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  };

  const save = async () => {
    try {
      setSaving(true);
      setError("");
      setMessage("");
      const res = await api.put("/mentorship-bookings/availability/my", {
        slots,
        slotDurationMin,
        notes,
        isActive,
      });
      setMessage(res.data.message || "Saved");
      if (res.data.availability) {
        setSlots(res.data.availability.slots || []);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-8 text-slate-500">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading availability…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold text-slate-900 dark:text-white">Weekly tutoring availability</h3>
        <p className="text-sm text-slate-500">
          Publish recurring office / peer-tutoring windows. Students book concrete slots from these
          hours.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </div>
      )}
      {message && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {message}
        </div>
      )}

      <div className="flex flex-wrap gap-4 text-sm">
        <label className="flex items-center gap-2">
          Slot length (min)
          <input
            type="number"
            min={15}
            max={120}
            step={15}
            value={slotDurationMin}
            onChange={(e) => setSlotDurationMin(Number(e.target.value) || 30)}
            className="w-20 rounded-md border border-slate-300 px-2 py-1 dark:border-slate-600 dark:bg-slate-950"
          />
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
          />
          Accepting bookings
        </label>
      </div>

      <div className="space-y-3">
        {slots.map((slot, index) => (
          <div
            key={index}
            className="grid gap-2 rounded-lg border border-slate-200 p-3 sm:grid-cols-6 dark:border-slate-700"
          >
            <select
              value={slot.day}
              onChange={(e) => updateSlot(index, { day: e.target.value })}
              className="rounded-md border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-950"
            >
              {DAYS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
            <input
              type="time"
              value={slot.startTime}
              onChange={(e) => updateSlot(index, { startTime: e.target.value })}
              className="rounded-md border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-950"
            />
            <input
              type="time"
              value={slot.endTime}
              onChange={(e) => updateSlot(index, { endTime: e.target.value })}
              className="rounded-md border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-950"
            />
            <input
              type="text"
              placeholder="Location"
              value={slot.location}
              onChange={(e) => updateSlot(index, { location: e.target.value })}
              className="rounded-md border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-950 sm:col-span-1"
            />
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={slot.isOnline}
                onChange={(e) => updateSlot(index, { isOnline: e.target.checked })}
              />
              Online
            </label>
            <button
              type="button"
              onClick={() => setSlots((prev) => prev.filter((_, i) => i !== index))}
              className="inline-flex items-center justify-center gap-1 rounded-md border border-rose-200 px-2 py-1 text-sm text-rose-700"
            >
              <Trash2 className="h-3.5 w-3.5" /> Remove
            </button>
          </div>
        ))}
      </div>

      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Notes for mentees (optional)"
        rows={2}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-950"
      />

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setSlots((prev) => [...prev, emptySlot()])}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600"
        >
          <Plus className="h-4 w-4" /> Add window
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={save}
          className="inline-flex items-center gap-2 rounded-lg bg-teal-700 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save schedule
        </button>
      </div>
    </div>
  );
}
