import { useEffect, useState } from "react";
import { Clock, Plus, Trash2, Save, MapPin, Wifi } from "lucide-react";
import api from "../api/axios";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

interface Slot {
  day: string;
  startTime: string;
  endTime: string;
  location: string;
  isOnline: boolean;
}

export default function OfficeHours() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [notes, setNotes] = useState("");
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    fetchOfficeHours();
  }, []);

  const fetchOfficeHours = async () => {
    try {
      setLoading(true);
      const res = await api.get("/office-hours/my");
      const data = res.data;
      if (data.slots) setSlots(data.slots);
      if (data.notes !== undefined) setNotes(data.notes);
      if (data.isActive !== undefined) setIsActive(data.isActive);
    } catch (error) {
      console.error("Failed to load office hours:", error);
    } finally {
      setLoading(false);
    }
  };

  const addSlot = () => {
    setSlots([...slots, { day: "Monday", startTime: "09:00", endTime: "10:00", location: "", isOnline: false }]);
  };

  const removeSlot = (index: number) => {
    setSlots(slots.filter((_, i) => i !== index));
  };

  const updateSlot = (index: number, field: keyof Slot, value: string | boolean) => {
    const updated = slots.map((slot, i) =>
      i === index ? { ...slot, [field]: value } : slot
    );
    setSlots(updated);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setMessage(null);
      await api.put("/office-hours/my", { slots, notes, isActive });
      setMessage({ type: "success", text: "Office hours saved successfully." });
    } catch (error: any) {
      setMessage({
        type: "error",
        text: error?.response?.data?.message || "Failed to save office hours.",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-3">
          <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-blue-600 border-t-transparent"></div>
          <p className="text-gray-600">Loading office hours...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {message && (
        <div
          className={`rounded-lg border px-4 py-3 text-sm ${
            message.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {message.text}
        </div>
      )}

      <section className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Weekly Office Hours</h2>
            <p className="text-sm text-gray-500">Set your weekly availability for student consultations.</p>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="h-4 w-4 text-blue-600"
              />
              Active
            </label>
            <button
              onClick={handleSave}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
              disabled={saving}
            >
              <Save className="w-4 h-4" />
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>

        {slots.length === 0 && (
          <div className="py-8 text-center text-gray-500">
            <Clock className="w-10 h-10 mx-auto mb-3 text-gray-300" />
            <p className="font-medium text-gray-600">No office hours set</p>
            <p className="text-sm mt-1">Click the button below to add your first time slot.</p>
          </div>
        )}

        <div className="space-y-3">
          {slots.map((slot, index) => (
            <div key={index} className="flex flex-wrap items-end gap-3 p-4 bg-gray-50 rounded-lg border border-gray-100">
              <label className="space-y-1 text-sm text-gray-600">
                Day
                <select
                  value={slot.day}
                  onChange={(e) => updateSlot(index, "day", e.target.value)}
                  className="block w-full border border-gray-200 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {DAYS.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </label>
              <label className="space-y-1 text-sm text-gray-600">
                Start
                <input
                  type="time"
                  value={slot.startTime}
                  onChange={(e) => updateSlot(index, "startTime", e.target.value)}
                  className="block w-full border border-gray-200 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </label>
              <label className="space-y-1 text-sm text-gray-600">
                End
                <input
                  type="time"
                  value={slot.endTime}
                  onChange={(e) => updateSlot(index, "endTime", e.target.value)}
                  className="block w-full border border-gray-200 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </label>
              <label className="space-y-1 text-sm text-gray-600 min-w-[140px]">
                <div className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  Location
                </div>
                <input
                  type="text"
                  value={slot.location}
                  onChange={(e) => updateSlot(index, "location", e.target.value)}
                  placeholder="e.g. Room 301"
                  className="block w-full border border-gray-200 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-600 pb-2">
                <input
                  type="checkbox"
                  checked={slot.isOnline}
                  onChange={(e) => updateSlot(index, "isOnline", e.target.checked)}
                  className="h-4 w-4 text-blue-600"
                />
                <Wifi className="w-3 h-3" />
                Online
              </label>
              <button
                onClick={() => removeSlot(index)}
                className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                title="Remove slot"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        <button
          onClick={addSlot}
          className="mt-4 inline-flex items-center gap-2 px-4 py-2 border border-dashed border-gray-300 text-gray-600 text-sm rounded-lg hover:border-blue-400 hover:text-blue-600 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Time Slot
        </button>
      </section>

      <section className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Notes</h2>
            <p className="text-sm text-gray-500">Optional message for students (e.g. how to book, meeting link).</p>
          </div>
        </div>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="Add any additional information..."
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
      </section>
    </div>
  );
}
