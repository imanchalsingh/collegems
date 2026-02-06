import React, { useState, useEffect } from "react";
import api from "../api/axios";

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
  // Form states
  const [examName, setExamName] = useState("");
  const [course, setCourse] = useState("");
  const [examDate, setExamDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [location, setLocation] = useState("");
  const [venue, setVenue] = useState("");

  // UI states
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [examSchedules, setExamSchedules] = useState<ExamSchedule[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCourse, setFilterCourse] = useState("all");

  // Fetch exam schedules on component mount
  useEffect(() => {
    fetchExamSchedules();
  }, []);

  // Filter unique courses for filter dropdown
  const uniqueCourses = [
    "all",
    ...new Set(examSchedules.map((exam) => exam.course)),
  ];

  // Filter exam schedules based on search and filter
  const filteredExams = examSchedules.filter((exam) => {
    const matchesSearch =
      exam.examName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      exam.course.toLowerCase().includes(searchTerm.toLowerCase()) ||
      exam.location.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCourse =
      filterCourse === "all" || exam.course === filterCourse;
    return matchesSearch && matchesCourse;
  });

  const fetchExamSchedules = async () => {
    try {
      setLoading(true);
      const response = await api.get("/examschedule/all");
      setExamSchedules(response.data || []);
    } catch (err: any) {
      console.error("Fetch exam error:", err);
      alert(err?.response?.data?.message || "Failed to fetch exam schedules");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setExamName("");
    setCourse("");
    setExamDate("");
    setStartTime("");
    setEndTime("");
    setLocation("");
    setVenue("");
    setIsEditMode(false);
    setEditingId(null);
  };

  const openCreateModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const openEditModal = (exam: ExamSchedule) => {
    setExamName(exam.examName);
    setCourse(exam.course);
    setExamDate(exam.examDate.split("T")[0]);
    setStartTime(exam.startTime);
    setEndTime(exam.endTime);
    setLocation(exam.location);
    setVenue(exam.venue);
    setIsEditMode(true);
    setEditingId(exam._id);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    resetForm();
  };

  const createExamSchedule = async () => {
    if (
      !examName ||
      !course ||
      !examDate ||
      !startTime ||
      !endTime ||
      !location ||
      !venue
    ) {
      alert("All fields are required");
      return;
    }

    try {
      setLoading(true);
      await api.post("/examschedule/add", {
        examName,
        course,
        examDate,
        startTime,
        endTime,
        location,
        venue,
      });

      alert("Exam schedule created ✅");
      closeModal();
      fetchExamSchedules();
    } catch (err: any) {
      console.error("Create exam error:", err);
      alert(err?.response?.data?.message || "Failed to create exam schedule");
    } finally {
      setLoading(false);
    }
  };

  const updateExamSchedule = async () => {
    if (!editingId) return;

    if (
      !examName ||
      !course ||
      !examDate ||
      !startTime ||
      !endTime ||
      !location ||
      !venue
    ) {
      alert("All fields are required");
      return;
    }

    try {
      setLoading(true);
      await api.put(`/examschedule/update/${editingId}`, {
        examName,
        course,
        examDate,
        startTime,
        endTime,
        location,
        venue,
      });

      alert("Exam schedule updated ✅");
      closeModal();
      fetchExamSchedules();
    } catch (err: any) {
      console.error("Update exam error:", err);
      alert(err?.response?.data?.message || "Failed to update exam schedule");
    } finally {
      setLoading(false);
    }
  };

  const deleteExamSchedule = async (id: string) => {
    if (
      !window.confirm("Are you sure you want to delete this exam schedule?")
    ) {
      return;
    }
    try {
      setLoading(true);
      await api.delete(`/examschedule/delete/${id}`);
      alert("Exam schedule deleted ✅");
      fetchExamSchedules();
    } catch (err: any) {
      console.error("Delete exam error:", err);
      alert(err?.response?.data?.message || "Failed to delete exam schedule");
    } finally {
      setLoading(false);
    }
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Calculate duration
  const calculateDuration = (start: string, end: string) => {
    const [startHour, startMin] = start.split(":").map(Number);
    const [endHour, endMin] = end.split(":").map(Number);
    const duration = endHour * 60 + endMin - (startHour * 60 + startMin);
    const hours = Math.floor(duration / 60);
    const minutes = duration % 60;
    return `${hours}h ${minutes}m`;
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold mb-2">
                Exam Schedule Management
              </h1>
              <p className="text-gray-400">
                Create and manage examination schedules
              </p>
            </div>
            <button
              onClick={openCreateModal}
              className="flex items-center gap-2 px-6 py-3 bg-linear-to-r from-[#0a295e] to-[#bd2323] text-white rounded-xl hover:shadow-lg hover:shadow-[#bd2323]/30 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] font-medium"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                />
              </svg>
              Create New Exam
            </button>
          </div>

          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4 mt-6">
            <div className="flex-1">
              <div className="relative">
                <svg
                  className="absolute left-3 top-3 w-5 h-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                <input
                  type="text"
                  placeholder="Search exams by name, course, or location..."
                  className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-[#bd2323] focus:ring-2 focus:ring-[#bd2323]/30 transition-all"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div className="w-full md:w-64">
              <select
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-[#bd2323] focus:ring-2 focus:ring-[#bd2323]/30 transition-all"
                value={filterCourse}
                onChange={(e) => setFilterCourse(e.target.value)}
              >
                {uniqueCourses.map((course) => (
                  <option key={course} value={course}>
                    {course === "all" ? "All Courses" : course}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={fetchExamSchedules}
              className="px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Refresh
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gray-800 rounded-xl p-6 border-l-4 border-[#0a295e]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total Exams</p>
                <p className="text-3xl font-bold mt-2">
                  {examSchedules.length}
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-[#0a295e]/20 flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-[#0a295e]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-xl p-6 border-l-4 border-[#e6c235]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Upcoming Exams</p>
                <p className="text-3xl font-bold mt-2">
                  {
                    examSchedules.filter(
                      (exam) => new Date(exam.examDate) > new Date(),
                    ).length
                  }
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-[#e6c235]/20 flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-[#e6c235]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-xl p-6 border-l-4 border-[#bd2323]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Active Courses</p>
                <p className="text-3xl font-bold mt-2">
                  {uniqueCourses.length - 1}
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-[#bd2323]/20 flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-[#bd2323]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Exam Schedules Table */}
        <div className="bg-gray-800 rounded-xl overflow-hidden mb-8">
          <div className="p-6 border-b border-gray-700">
            <h3 className="text-xl font-semibold">Exam Schedules</h3>
            <p className="text-gray-400 text-sm mt-1">
              Showing {filteredExams.length} exams
            </p>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#bd2323]"></div>
              <p className="mt-2 text-gray-400">Loading exam schedules...</p>
            </div>
          ) : filteredExams.length === 0 ? (
            <div className="text-center py-12">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
              <p className="mt-2 text-gray-400">No exam schedules found.</p>
              <button
                onClick={openCreateModal}
                className="mt-4 px-4 py-2 bg-linear-to-r from-[#0a295e] to-[#bd2323] text-white rounded-lg hover:opacity-90 transition-opacity"
              >
                Create your first exam
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-750">
                    <th className="text-left py-3 px-6 text-gray-400 font-medium">
                      Exam Name
                    </th>
                    <th className="text-left py-3 px-6 text-gray-400 font-medium">
                      Course
                    </th>
                    <th className="text-left py-3 px-6 text-gray-400 font-medium">
                      Date & Time
                    </th>
                    <th className="text-left py-3 px-6 text-gray-400 font-medium">
                      Duration
                    </th>
                    <th className="text-left py-3 px-6 text-gray-400 font-medium">
                      Location
                    </th>
                    <th className="text-left py-3 px-6 text-gray-400 font-medium">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredExams.map((exam) => (
                    <tr
                      key={exam._id}
                      className="border-b border-gray-700/50 hover:bg-gray-750/50 transition-colors group"
                    >
                      <td className="py-4 px-6">
                        <div className="font-medium">{exam.examName}</div>
                        <div className="text-sm text-gray-400">
                          {exam.venue}
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-[#0a295e]/20 text-[#4dabf7] border border-[#0a295e]/30">
                          {exam.course}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <div className="font-medium">
                          {formatDate(exam.examDate)}
                        </div>
                        <div className="text-sm text-gray-400">
                          {exam.startTime} - {exam.endTime}
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-[#e6c235]/20 text-[#e6c235] border border-[#e6c235]/30">
                          {calculateDuration(exam.startTime, exam.endTime)}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <svg
                            className="w-4 h-4 text-gray-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                          </svg>
                          {exam.location}
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openEditModal(exam)}
                            className="p-2 text-[#e6c235] hover:bg-[#e6c235]/10 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                              />
                            </svg>
                          </button>
                          <button
                            onClick={() => deleteExamSchedule(exam._id)}
                            className="p-2 text-[#ef4444] hover:bg-[#ef4444]/10 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
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
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
              onClick={closeModal}
            />

            {/* Modal Content */}
            <div className="relative w-full max-w-2xl bg-gray-800 rounded-2xl shadow-2xl border border-gray-700 overflow-hidden animate-in fade-in zoom-in-95">
              {/* Header */}
              <div
                className="p-6"
                style={{
                  background:
                    "linear-gradient(135deg, #0a295e 0%, rgba(189, 35, 35, 0.2) 100%)",
                  borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
                }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-white">
                      {isEditMode
                        ? "Edit Exam Schedule"
                        : "Create New Exam Schedule"}
                    </h3>
                    <p className="text-gray-300 text-sm mt-1">
                      {isEditMode
                        ? "Update the exam details below"
                        : "Fill in the exam details below"}
                    </p>
                  </div>
                  <button
                    onClick={closeModal}
                    disabled={loading}
                    className="text-gray-400 hover:text-white transition-colors disabled:opacity-50"
                  >
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Form */}
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Exam Name */}
                  <div>
                    <label className="block text-gray-300 text-sm font-medium mb-2">
                      Exam Name *
                    </label>
                    <input
                      className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-[#bd2323] focus:ring-2 focus:ring-[#bd2323]/30 transition-all"
                      placeholder="e.g., Final Examination"
                      value={examName}
                      onChange={(e) => setExamName(e.target.value)}
                      disabled={loading}
                    />
                  </div>

                  {/* Course */}
                  <div>
                    <label className="block text-gray-300 text-sm font-medium mb-2">
                      Course ID *
                    </label>
                    <input
                      className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-[#bd2323] focus:ring-2 focus:ring-[#bd2323]/30 transition-all"
                      placeholder="e.g., CS101"
                      value={course}
                      onChange={(e) => setCourse(e.target.value)}
                      disabled={loading}
                    />
                  </div>

                  {/* Exam Date */}
                  <div>
                    <label className="block text-gray-300 text-sm font-medium mb-2">
                      Exam Date *
                    </label>
                    <div className="relative">
                      <input
                        type="date"
                        className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-[#bd2323] focus:ring-2 focus:ring-[#bd2323]/30 transition-all appearance-none"
                        value={examDate}
                        onChange={(e) => setExamDate(e.target.value)}
                        disabled={loading}
                      />
                      <svg
                        className="absolute right-3 top-3 w-5 h-5 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                    </div>
                  </div>

                  {/* Start Time */}
                  <div>
                    <label className="block text-gray-300 text-sm font-medium mb-2">
                      Start Time *
                    </label>
                    <div className="relative">
                      <input
                        type="time"
                        className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-[#bd2323] focus:ring-2 focus:ring-[#bd2323]/30 transition-all"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        disabled={loading}
                      />
                      <svg
                        className="absolute right-3 top-3 w-5 h-5 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </div>
                  </div>

                  {/* End Time */}
                  <div>
                    <label className="block text-gray-300 text-sm font-medium mb-2">
                      End Time *
                    </label>
                    <div className="relative">
                      <input
                        type="time"
                        className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-[#bd2323] focus:ring-2 focus:ring-[#bd2323]/30 transition-all"
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                        disabled={loading}
                      />
                      <svg
                        className="absolute right-3 top-3 w-5 h-5 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </div>
                  </div>

                  {/* Location */}
                  <div>
                    <label className="block text-gray-300 text-sm font-medium mb-2">
                      Location *
                    </label>
                    <input
                      className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-[#bd2323] focus:ring-2 focus:ring-[#bd2323]/30 transition-all"
                      placeholder="e.g., Main Building"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      disabled={loading}
                    />
                  </div>

                  {/* Venue */}
                  <div className="md:col-span-2">
                    <label className="block text-gray-300 text-sm font-medium mb-2">
                      Venue Details
                    </label>
                    <input
                      className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-[#bd2323] focus:ring-2 focus:ring-[#bd2323]/30 transition-all"
                      placeholder="e.g., Room 101, Ground Floor"
                      value={venue}
                      onChange={(e) => setVenue(e.target.value)}
                      disabled={loading}
                    />
                  </div>
                </div>
              </div>

              {/* Footer Buttons */}
              <div className="p-6 bg-gray-850 border-t border-gray-700">
                <div className="flex justify-end gap-3">
                  <button
                    onClick={closeModal}
                    disabled={loading}
                    className="px-5 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={
                      isEditMode ? updateExamSchedule : createExamSchedule
                    }
                    disabled={
                      loading ||
                      !examName ||
                      !course ||
                      !examDate ||
                      !startTime ||
                      !endTime ||
                      !location ||
                      !venue
                    }
                    className="px-5 py-2 bg-linear-to-r from-[#bd2323] to-[#0a295e] text-white rounded-lg hover:shadow-lg hover:shadow-[#bd2323]/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 min-w-30 justify-center"
                  >
                    {loading ? (
                      <>
                        <svg
                          className="animate-spin h-4 w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          />
                        </svg>
                        {isEditMode ? "Updating..." : "Creating..."}
                      </>
                    ) : (
                      <>
                        {isEditMode ? (
                          <>
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                            Update Exam
                          </>
                        ) : (
                          <>
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                              />
                            </svg>
                            Create Exam
                          </>
                        )}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExamSchedule;
