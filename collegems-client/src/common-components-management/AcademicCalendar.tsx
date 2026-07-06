import React, { useState, useEffect } from "react";
import {
  Calendar as CalendarIcon,
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  X,
  Clock,
  MapPin,
  Edit2,
  Trash2,
  Loader2
} from "lucide-react";
import api from "../api/axios";

// 1. Fixed the broken interface
export interface CalendarEvent {
  _id?: string;
  title: string;
  description: string;
  category: "Exam" | "Assignment" | "Holiday" | "Workshop" | "Event" | "Deadline";
  date: string | Date;
  startTime?: string;
  endTime?: string;
  location?: string;
  isSystemGenerated?: boolean;
}

interface AcademicCalendarProps {
  role?: string;
}

export default function AcademicCalendar({ role }: AcademicCalendarProps) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  // Calendar View Date
  const [currentDate, setCurrentDate] = useState(new Date());
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Modals & Forms State
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form Fields
  const [formTitle, setFormTitle] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formCat, setFormCat] = useState<CalendarEvent["category"]>("Event");
  const [formDate, setFormDate] = useState("");
  const [formStart, setFormStart] = useState("");
  const [formEnd, setFormEnd] = useState("");
  const [formLoc, setFormLoc] = useState("");
  const [formErr, setFormErr] = useState<string | null>(null);

  const categories = ["Exam", "Assignment", "Holiday", "Workshop", "Event", "Deadline"];

  const catColors: Record<CalendarEvent["category"], string> = {
    Exam: "bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800 dot:bg-red-500",
    Assignment: "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800 dot:bg-blue-500",
    Holiday: "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 dot:bg-emerald-500",
    Workshop: "bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800 dot:bg-amber-500",
    Event: "bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800 dot:bg-purple-500",
    Deadline: "bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800 dot:bg-rose-500"
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const res = await api.get("/academic-calendar");
      if (res.data.success) setEvents(res.data.data);
    } catch (err) {
      console.error("Failed to load events", err);
    } finally {
      setLoading(false);
    }
  };

  // Calendar calculations
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay();

  // Filter events
  const filteredEvents = events.filter((e) => {
    const matchesSearch =
      e.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "All" || e.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getDayEvents = (day: number) => {
    return filteredEvents.filter((e) => {
      const eDate = new Date(e.date);
      return (
        eDate.getUTCDate() === day &&
        eDate.getUTCMonth() === month &&
        eDate.getUTCFullYear() === year
      );
    });
  };

  const handleOpenAdd = () => {
    setIsEditing(false);
    setFormTitle("");
    setFormDesc("");
    setFormCat("Event");
    setFormDate(new Date().toISOString().split("T")[0]);
    setFormStart("");
    setFormEnd("");
    setFormLoc("");
    setFormErr(null);
    setShowForm(true);
  };

  const handleOpenEdit = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setIsEditing(true);
    setFormTitle(event.title);
    setFormDesc(event.description);
    setFormCat(event.category);
    setFormDate(new Date(event.date).toISOString().split("T")[0]);
    setFormStart(event.startTime || "");
    setFormEnd(event.endTime || "");
    setFormLoc(event.location || "");
    setFormErr(null);
    setShowDetails(false);
    setShowForm(true);
  };

  const handleDelete = async (id?: string) => {
    if (!id || !window.confirm("Delete this event?")) return;
    try {
      await api.delete(`/academic-calendar/${id}`);
      setEvents((prev) => prev.filter((e) => e._id !== id));
      setShowDetails(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErr(null);
    if (!formTitle.trim() || !formDesc.trim() || !formDate) {
      return setFormErr("Required fields are missing.");
    }

    setIsSubmitting(true);
    const payload = {
      title: formTitle,
      description: formDesc,
      category: formCat,
      date: formDate,
      startTime: formStart,
      endTime: formEnd,
      location: formLoc
    };

    try {
      if (isEditing && selectedEvent?._id) {
        const res = await api.put(`/academic-calendar/${selectedEvent._id}`, payload);
        if (res.data.success) {
          setEvents((prev) => prev.map((item) => (item._id === selectedEvent._id ? res.data.data : item)));
          setShowForm(false);
        }
      } else {
        const res = await api.post("/academic-calendar", payload);
        if (res.data.success) {
          setEvents((prev) => [...prev, res.data.data]);
          setShowForm(false);
        }
      }
    } catch (err: any) {
      setFormErr(err.response?.data?.message || "Failed to save event.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-12 min-h-[300px]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600 dark:text-blue-400" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            Academic Calendar
          </h2>
        </div>
        {role === "hod" && (
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> Add Event
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-3 rounded-xl shadow-xs">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
          <input
            type="text"
            placeholder="Search events..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 bg-gray-50/50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
          />
        </div>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-2.5 py-1.5 text-xs border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
        >
          <option value="All">All Categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {/* Calendar Grid Container */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4 shadow-xs">
        {/* Month Selector */}
        <div className="flex justify-between items-center mb-4">
          <span className="text-sm font-bold text-gray-800 dark:text-gray-200">
            {currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
          </span>
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 p-0.5 rounded-lg text-xs">
            <button onClick={() => setCurrentDate(new Date(year, month - 1, 1))} className="p-1 hover:bg-white dark:hover:bg-gray-700 rounded cursor-pointer">
              <ChevronLeft className="w-3.5 h-3.5 text-gray-600 dark:text-gray-400" />
            </button>
            <button onClick={() => setCurrentDate(new Date())} className="px-2 py-0.5 hover:bg-white dark:hover:bg-gray-700 rounded cursor-pointer font-medium text-gray-700 dark:text-gray-300">
              Today
            </button>
            <button onClick={() => setCurrentDate(new Date(year, month + 1, 1))} className="p-1 hover:bg-white dark:hover:bg-gray-700 rounded cursor-pointer">
              <ChevronRight className="w-3.5 h-3.5 text-gray-600 dark:text-gray-400" />
            </button>
          </div>
        </div>

        {/* Days grid */}
        <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div key={d} className="py-1">{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {/* Fill blank cells prior to start day */}
          {Array.from({ length: firstDayIndex }).map((_, i) => (
            <div key={`blank-${i}`} className="min-h-[60px] bg-gray-50/50 dark:bg-gray-800/50 rounded-lg opacity-30" />
          ))}

          {/* Current month days */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const dayEvents = getDayEvents(day);
            const isToday = day === new Date().getDate() && month === new Date().getMonth() && year === new Date().getFullYear();

            return (
              <div
                key={`day-${day}`}
                className={`min-h-[70px] border rounded-lg p-1.5 flex flex-col justify-between hover:border-blue-400 transition-all ${
                  isToday 
                    ? "bg-blue-50/30 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800" 
                    : "bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800"
                }`}
              >
                <span className={`text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center ${
                  isToday 
                    ? "bg-blue-600 dark:bg-blue-500 text-white" 
                    : "text-gray-700 dark:text-gray-400"
                }`}>
                  {day}
                </span>

                <div className="mt-1 space-y-0.5 max-h-[45px] overflow-hidden">
                  {dayEvents.slice(0, 2).map((ev, idx) => (
                    <button
                      key={idx}
                      onClick={() => { setSelectedEvent(ev); setShowDetails(true); }}
                      className={`w-full text-left truncate text-[9px] px-1 py-0.5 rounded leading-tight block cursor-pointer border ${catColors[ev.category]}`}
                    >
                      {ev.title}
                    </button>
                  ))}
                  {dayEvents.length > 2 && (
                    <span className="text-[8px] text-gray-400 dark:text-gray-500 font-bold block text-center">+{dayEvents.length - 2} more</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* LEGEND */}
      <div className="flex flex-wrap gap-3 text-[9px] font-semibold text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 p-2.5 rounded-lg border border-gray-200 dark:border-gray-700">
        {categories.map((c) => (
          <div key={c} className="flex items-center gap-1">
            <span className={`w-2 h-2 rounded-full ${
              c === "Exam" ? "bg-red-500" : 
              c === "Assignment" ? "bg-blue-500" : 
              c === "Holiday" ? "bg-emerald-500" : 
              c === "Workshop" ? "bg-amber-500" : 
              c === "Event" ? "bg-purple-500" : "bg-rose-500"
            }`} />
            <span>{c}</span>
          </div>
        ))}
      </div>

      {/* DETAIL MODAL */}
      {showDetails && selectedEvent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg max-w-md w-full overflow-hidden">
            <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${catColors[selectedEvent.category]}`}>
                {selectedEvent.category}
              </span>
              <button onClick={() => setShowDetails(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded cursor-pointer">
                <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <h3 className="font-bold text-sm text-gray-900 dark:text-white">{selectedEvent.title}</h3>
              <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed bg-gray-50 dark:bg-gray-800 p-3 rounded-lg border border-gray-100 dark:border-gray-700">{selectedEvent.description}</p>
              
              <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 dark:text-gray-400 pt-1">
                <div className="flex items-center gap-1.5">
                  <CalendarIcon className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
                  <span>{new Date(selectedEvent.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })}</span>
                </div>
                {(selectedEvent.startTime || selectedEvent.endTime) && (
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
                    <span>{selectedEvent.startTime}{selectedEvent.endTime ? ` - ${selectedEvent.endTime}` : ""}</span>
                  </div>
                )}
                {selectedEvent.location && (
                  <div className="flex items-center gap-1.5 col-span-2">
                    <MapPin className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
                    <span>{selectedEvent.location}</span>
                  </div>
                )}
              </div>
            </div>
            <div className="p-3 bg-gray-50 dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-1.5">
              <button onClick={() => setShowDetails(false)} className="px-3 py-1.5 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg text-xs font-semibold cursor-pointer text-gray-700 dark:text-gray-300">
                Close
              </button>
              {role === "hod" && !selectedEvent.isSystemGenerated && (
                <>
                  <button onClick={() => handleOpenEdit(selectedEvent)} className="flex items-center gap-1 px-3 py-1.5 border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 bg-white dark:bg-gray-900 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg text-xs font-semibold cursor-pointer">
                    <Edit2 className="w-3 h-3" /> Edit
                  </button>
                  <button onClick={() => handleDelete(selectedEvent._id)} className="flex items-center gap-1 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold cursor-pointer">
                    <Trash2 className="w-3 h-3" /> Delete
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* FORM MODAL */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg max-w-md w-full overflow-hidden">
            <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/50">
              <h3 className="font-bold text-xs uppercase tracking-wider text-gray-700 dark:text-gray-300">
                {isEditing ? "Modify Event" : "Create Event"}
              </h3>
              <button onClick={() => setShowForm(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer">
                <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-3.5">
              {formErr && <p className="text-[10px] text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-2 rounded-lg border border-red-200 dark:border-red-800">{formErr}</p>}
              
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-600 dark:text-gray-400 uppercase">Title *</label>
                <input type="text" required placeholder="Event title..." value={formTitle} onChange={(e) => setFormTitle(e.target.value)} className="w-full px-2.5 py-1.5 text-xs border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 bg-gray-50/30 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-600 dark:text-gray-400 uppercase">Category *</label>
                  <select value={formCat} onChange={(e) => setFormCat(e.target.value as CalendarEvent["category"])} className="w-full px-2 py-1.5 text-xs border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
                    {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-600 dark:text-gray-400 uppercase">Date *</label>
                  <input type="date" required value={formDate} onChange={(e) => setFormDate(e.target.value)} className="w-full px-2 py-1.5 text-xs border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 bg-gray-50/30 dark:bg-gray-800 text-gray-900 dark:text-white" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-600 dark:text-gray-400 uppercase">Start Time</label>
                  <input type="text" placeholder="e.g. 09:00 AM" value={formStart} onChange={(e) => setFormStart(e.target.value)} className="w-full px-2 py-1.5 text-xs border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 bg-gray-50/30 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-600 dark:text-gray-400 uppercase">End Time</label>
                  <input type="text" placeholder="e.g. 11:30 AM" value={formEnd} onChange={(e) => setFormEnd(e.target.value)} className="w-full px-2 py-1.5 text-xs border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 bg-gray-50/30 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-600 dark:text-gray-400 uppercase">Location</label>
                <input type="text" placeholder="Room/Lab/Hall..." value={formLoc} onChange={(e) => setFormLoc(e.target.value)} className="w-full px-2.5 py-1.5 text-xs border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 bg-gray-50/30 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500" />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-600 dark:text-gray-400 uppercase">Description *</label>
                <textarea required placeholder="Outline event details..." rows={3} value={formDesc} onChange={(e) => setFormDesc(e.target.value)} className="w-full px-2.5 py-1.5 text-xs border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 bg-gray-50/30 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 resize-none" />
              </div>

              <div className="pt-2 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-1.5">
                <button type="button" onClick={() => setShowForm(false)} className="px-3 py-1.5 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg text-xs font-semibold cursor-pointer text-gray-700 dark:text-gray-300">
                  Cancel
                </button>
                <button type="submit" disabled={isSubmitting} className="min-w-[65px] px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold cursor-pointer disabled:opacity-50">
                  {isSubmitting ? "..." : isEditing ? "Save" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}