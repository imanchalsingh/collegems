import React, { useState, useEffect } from "react";
import api from "../../api/axios";

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
  // UI states
  const [examSchedules, setExamSchedules] = useState<ExamSchedule[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

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
    const matchesCourse = searchTerm === "all" || exam.course === searchTerm;
    return matchesSearch && matchesCourse;
  });

  const fetchExamSchedules = async () => {
    try {
      const response = await api.get("/examschedule/all");
      setExamSchedules(response.data || []);
    } catch (err: any) {
      console.error("Fetch exam error:", err);
      alert(err?.response?.data?.message || "Failed to fetch exam schedules");
    }
  };

  const calculateDuration = (startTime: string, endTime: string) => {
    const [sh, sm] = startTime.split(":").map(Number);
    const [eh, em] = endTime.split(":").map(Number);

    const startMinutes = sh * 60 + sm;
    const endMinutes = eh * 60 + em;

    let diff = endMinutes - startMinutes;

    // agar exam midnight cross karta ho
    if (diff < 0) diff += 24 * 60;

    const hours = Math.floor(diff / 60);
    const minutes = diff % 60;

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
              <select className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-[#bd2323] focus:ring-2 focus:ring-[#bd2323]/30 transition-all">
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
                   Time
                  </th>
                  <th className="text-left py-3 px-6 text-gray-400 font-medium">
                    Duration
                  </th>
                  <th className="text-left py-3 px-6 text-gray-400 font-medium">
                    Location
                  </th>
                  <th className="text-left py-3 px-6 text-gray-400 font-medium">
                    Venue
                  </th>
                  <th className="text-left py-3 px-6 text-gray-400 font-medium">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody>
                {examSchedules.map((exam) => (
                  <tr
                    key={exam._id}
                    className="border-b border-gray-700/50 hover:bg-gray-750/50 transition-colors group"
                  >
                    <td className="py-4 px-6">
                      <div className="font-medium">{exam.examName}</div>
                    </td>
                    <td className="py-4 px-6">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-[#0a295e]/20 text-[#4dabf7] border border-[#0a295e]/30">
                        {exam.course}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="font-medium"></div>
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
                    <td className="py-4 px-6">{exam.venue}</td>
                    <td className="py-4 px-6">
                      {new Date(exam.examDate).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExamSchedule;
