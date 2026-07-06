import React, { useState, useEffect } from "react";
import { useTheme } from "../context/ThemeContext";
import {
  Calendar, Clock, MapPin, BookOpen, Search, Filter, ChevronDown,
  Plus, RefreshCw, Edit, Trash2, X, CheckCircle, AlertCircle,
  FileText, Building2,
} from "lucide-react";
import api from "../api/axios";
import { extractArray } from "../utils/apiHelpers";

interface ExamSchedule {
  _id: string;
  examName: string;
  course: string;
  examDate: string;
  startTime: string;
  endTime: string;
  location: string;
  venue: string;
  createdAt?: string;
  updatedAt?: string;
}

const ExamSchedule: React.FC = () => {
  const [examName, setExamName] = useState("");
  const [course, setCourse] = useState("");
  const [examDate, setExamDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [location, setLocation] = useState("");
  const [venue, setVenue] = useState("");

  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [examSchedules, setExamSchedules] = useState<ExamSchedule[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCourse, setFilterCourse] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => { fetchExamSchedules(); }, []);

  const uniqueCourses = ["all", ...new Set(examSchedules.map((exam) => exam.course))];

  const filteredExams = examSchedules.filter((exam) => {
    const matchesSearch =
      exam.examName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      exam.course.toLowerCase().includes(searchTerm.toLowerCase()) ||
      exam.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
      exam.venue.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCourse = filterCourse === "all" || exam.course === filterCourse;
    return matchesSearch && matchesCourse;
  });

  const fetchExamSchedules = async () => {
    try {
      setLoading(true);
      const response = await api.get("/examschedule/all");
      setExamSchedules(extractArray(response.data));
      setMessage(null);
    } catch (err: any) {
      setMessage({ type: "error", text: err?.response?.data?.message || "Failed to fetch exam schedules" });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setExamName(""); setCourse(""); setExamDate(""); setStartTime("");
    setEndTime(""); setLocation(""); setVenue("");
    setIsEditMode(false); setEditingId(null); setMessage(null);
  };

  const openCreateModal = () => { resetForm(); setIsModalOpen(true); };

  const openEditModal = (exam: ExamSchedule) => {
    setExamName(exam.examName); setCourse(exam.course);
    setExamDate(exam.examDate.split("T")[0]); setStartTime(exam.startTime);
    setEndTime(exam.endTime); setLocation(exam.location); setVenue(exam.venue);
    setIsEditMode(true); setEditingId(exam._id); setIsModalOpen(true);
  };

  const closeModal = () => { setIsModalOpen(false); resetForm(); };

  const createExamSchedule = async () => {
    if (!examName || !course || !examDate || !startTime || !endTime || !location || !venue) {
      setMessage({ type: "error", text: "All fields are required" });
      return;
    }
    try {
      setLoading(true);
      await api.post("/examschedule/add", { examName, course, examDate, startTime, endTime, location, venue });
      setMessage({ type: "success", text: "Exam schedule created successfully!" });
      setTimeout(() => { closeModal(); fetchExamSchedules(); }, 1500);
    } catch (err: any) {
      setMessage({ type: "error", text: err?.response?.data?.message || "Failed to create exam schedule" });
    } finally {
      setLoading(false);
    }
  };

  const updateExamSchedule = async () => {
    if (!editingId) return;
    if (!examName || !course || !examDate || !startTime || !endTime || !location || !venue) {
      setMessage({ type: "error", text: "All fields are required" });
      return;
    }
    try {
      setLoading(true);
      await api.put(`/examschedule/update/${editingId}`, { examName, course, examDate, startTime, endTime, location, venue });
      setMessage({ type: "success", text: "Exam schedule updated successfully!" });
      setTimeout(() => { closeModal(); fetchExamSchedules(); }, 1500);
    } catch (err: any) {
      setMessage({ type: "error", text: err?.response?.data?.message || "Failed to update exam schedule" });
    } finally {
      setLoading(false);
    }
  };

  const deleteExamSchedule = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this exam schedule?")) return;
    try {
      setLoading(true);
      await api.delete(`/examschedule/delete/${id}`);
      setMessage({ type: "success", text: "Exam schedule deleted successfully!" });
      fetchExamSchedules();
    } catch (err: any) {
      setMessage({ type: "error", text: err?.response?.data?.message || "Failed to delete exam schedule" });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      weekday: "short", year: "numeric", month: "short", day: "numeric", timeZone: "UTC"
    });
  };

  const calculateDuration = (start: string, end: string) => {
    const [sh, sm] = start.split(":").map(Number);
    const [eh, em] = end.split(":").map(Number);
    const dur = eh * 60 + em - (sh * 60 + sm);
    return `${Math.floor(dur / 60)}h ${dur % 60}m`;
  };

  const isUpcoming = (date: string) => date > new Date().toLocaleDateString('en-CA');

  const stats = {
    total: examSchedules.length,
    upcoming: examSchedules.filter((e) => isUpcoming(e.examDate)).length,
    courses: uniqueCourses.length - 1,
  };

  // Shared class helpers
  const cardCls = "bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5";
  const inputCls = "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-700 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50";
  const selectCls = "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className={cardCls}>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
              <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Exams</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
            </div>
          </div>
        </div>
        <div className={cardCls}>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-50 dark:bg-amber-900/30 rounded-lg">
              <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Upcoming Exams</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{stats.upcoming}</p>
            </div>
          </div>
        </div>
        <div className={cardCls}>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg">
              <BookOpen className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Active Courses</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{stats.courses}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search exams by name, course, or location..."
              className={`${inputCls} pl-10`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <Filter className="w-4 h-4" />
            Filters
            <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? "rotate-180" : ""}`} />
          </button>
          <button
            onClick={fetchExamSchedules}
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" /> Create New Exam
          </button>
        </div>

        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Course</label>
                <select className={selectCls} value={filterCourse} onChange={(e) => setFilterCourse(e.target.value)}>
                  {uniqueCourses.map((c) => (
                    <option key={c} value={c}>{c === "all" ? "All Courses" : c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date Range</label>
                <select className={selectCls}>
                  <option value="all">All Dates</option>
                  <option value="upcoming">Upcoming</option>
                  <option value="past">Past</option>
                  <option value="this-week">This Week</option>
                  <option value="this-month">This Month</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Message Display */}
      {message && (
        <div className={`p-4 rounded-lg flex items-start gap-3 ${
          message.type === "success"
            ? "bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-400 border border-green-200 dark:border-green-800"
            : "bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-400 border border-red-200 dark:border-red-800"
        }`}>
          {message.type === "success"
            ? <CheckCircle className="w-5 h-5 shrink-0 mt-0.5" />
            : <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />}
          <span className="text-sm flex-1">{message.text}</span>
          <button onClick={() => setMessage(null)} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Exam Schedules Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 dark:text-white">Exam Schedules</h3>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Showing {filteredExams.length} of {examSchedules.length} exams
            </span>
          </div>
        </div>

        {loading && !isModalOpen ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent"></div>
            <p className="mt-4 text-gray-500 dark:text-gray-400">Loading exam schedules...</p>
          </div>
        ) : filteredExams.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
              <FileText className="w-8 h-8 text-gray-400 dark:text-gray-500" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No exam schedules found</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              {searchTerm || filterCourse !== "all"
                ? "Try adjusting your search or filters"
                : "Get started by creating your first exam schedule"}
            </p>
            {searchTerm || filterCourse !== "all" ? (
              <button
                onClick={() => { setSearchTerm(""); setFilterCourse("all"); }}
                className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <X className="w-4 h-4" /> Clear filters
              </button>
            ) : (
              <button
                onClick={openCreateModal}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" /> Create your first exam
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  {["Exam Details", "Course", "Date & Time", "Duration", "Location", "Actions"].map((h) => (
                    <th key={h} className="text-left py-3 px-6 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredExams.map((exam) => (
                  <tr key={exam._id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="py-4 px-6">
                      <div className="font-medium text-gray-900 dark:text-white">{exam.examName}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        <span className="inline-flex items-center gap-1">
                          <Building2 className="w-3 h-3" />{exam.venue}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300">
                        {exam.course}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                        <span className="text-gray-900 dark:text-white">{formatDate(exam.examDate)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm mt-1">
                        <Clock className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                        <span className="text-gray-600 dark:text-gray-400">{exam.startTime} - {exam.endTime}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300">
                        {calculateDuration(exam.startTime, exam.endTime)}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                        <span className="text-gray-600 dark:text-gray-400">{exam.location}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEditModal(exam)}
                          className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteExamSchedule(exam._id)}
                          className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative w-full max-w-2xl bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {isEditMode ? "Edit Exam Schedule" : "Create New Exam Schedule"}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {isEditMode ? "Update the exam details below" : "Fill in the exam details below"}
                  </p>
                </div>
                <button
                  onClick={closeModal}
                  disabled={loading}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Exam Name *</label>
                  <input className={inputCls} placeholder="e.g., Final Examination - Semester 1" value={examName} onChange={(e) => setExamName(e.target.value)} disabled={loading} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Course *</label>
                  <input className={inputCls} placeholder="e.g., BCA, BBA, MBA" value={course} onChange={(e) => setCourse(e.target.value)} disabled={loading} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Exam Date *</label>
                  <input type="date" className={inputCls} value={examDate} onChange={(e) => setExamDate(e.target.value)} disabled={loading} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Start Time *</label>
                  <input type="time" className={inputCls} value={startTime} onChange={(e) => setStartTime(e.target.value)} disabled={loading} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">End Time *</label>
                  <input type="time" className={inputCls} value={endTime} onChange={(e) => setEndTime(e.target.value)} disabled={loading} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Location *</label>
                  <input className={inputCls} placeholder="e.g., Main Building" value={location} onChange={(e) => setLocation(e.target.value)} disabled={loading} />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Venue Details *</label>
                  <input className={inputCls} placeholder="e.g., Room 101, Ground Floor" value={venue} onChange={(e) => setVenue(e.target.value)} disabled={loading} />
                </div>
              </div>

              {message && (
                <div className={`mt-4 p-3 rounded-lg flex items-start gap-2 ${
                  message.type === "success"
                    ? "bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-400"
                    : "bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-400"
                }`}>
                  {message.type === "success"
                    ? <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    : <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />}
                  <span className="text-sm">{message.text}</span>
                </div>
              )}
            </div>

            <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-700">
              <div className="flex justify-end gap-3">
                <button
                  onClick={closeModal}
                  disabled={loading}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={isEditMode ? updateExamSchedule : createExamSchedule}
                  disabled={loading || !examName || !course || !examDate || !startTime || !endTime || !location || !venue}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      {isEditMode ? "Updating..." : "Creating..."}
                    </>
                  ) : (
                    <>{isEditMode ? "Update Exam" : "Create Exam"}</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExamSchedule;