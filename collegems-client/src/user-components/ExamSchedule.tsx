import React, { useState, useEffect } from "react";
import { useTheme } from "../context/ThemeContext";
import {
  Calendar, Clock, MapPin, BookOpen, Search, RefreshCw,
  Filter, ChevronDown, Download, Plus, Building2, GraduationCap,
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
  const [examSchedules, setExamSchedules] = useState<ExamSchedule[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCourse, setSelectedCourse] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchExamSchedules();
  }, []);

  const uniqueCourses = [
    "all",
    ...new Set(examSchedules.map((exam) => exam.course)),
  ];

  const filteredExams = examSchedules.filter((exam) => {
    const matchesSearch =
      exam.examName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      exam.course.toLowerCase().includes(searchTerm.toLowerCase()) ||
      exam.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
      exam.venue.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCourse = selectedCourse === "all" || exam.course === selectedCourse;
    return matchesSearch && matchesCourse;
  });

  const fetchExamSchedules = async () => {
    try {
      setLoading(true);
      const response = await api.get("/examschedule/all");
      setExamSchedules(extractArray(response.data));
    } catch (err: any) {
      console.error("Fetch exam error:", err);
    } finally {
      setLoading(false);
    }
  };

  const calculateDuration = (startTime: string, endTime: string) => {
    const [sh, sm] = startTime.split(":").map(Number);
    const [eh, em] = endTime.split(":").map(Number);
    const startMinutes = sh * 60 + sm;
    const endMinutes = eh * 60 + em;
    let diff = endMinutes - startMinutes;
    if (diff < 0) diff += 24 * 60;
    const hours = Math.floor(diff / 60);
    const minutes = diff % 60;
    return `${hours}h ${minutes}m`;
  };

  const getUpcomingExams = () => {
    const todayStr = new Date().toLocaleDateString('en-CA');
    return examSchedules.filter((exam) => exam.examDate >= todayStr).length;
  };

  const getTodayExams = () => {
    const todayStr = new Date().toLocaleDateString('en-CA');
    return examSchedules.filter(
      (exam) => exam.examDate === todayStr
    ).length;
  };

  const stats = [
    {
      label: "Total Exams",
      value: examSchedules.length,
      icon: BookOpen,
      color: "blue",
      change: "+12% from last month",
    },
    {
      label: "Upcoming Exams",
      value: getUpcomingExams(),
      icon: Calendar,
      color: "amber",
      change: `${getTodayExams()} scheduled today`,
    },
    {
      label: "Active Courses",
      value: uniqueCourses.length - 1,
      icon: GraduationCap,
      color: "emerald",
      change: "Across all semesters",
    },
  ];

  return (
    <>
      <div className="space-y-6 p-10 bg-gray-50 dark:bg-gray-950 min-h-screen">
          {/* Header */}
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Exam Schedule Management</h1>
                <p className="text-gray-500 dark:text-gray-400 mt-1">Create and manage examination schedules</p>
              </div>
              <div className="flex items-center gap-3">
                <button className="inline-flex items-center gap-2 px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  <Download className="w-4 h-4" />
                  Export
                </button>
                <button className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                  <Plus className="w-4 h-4" />
                  New Exam
                </button>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {stats.map((stat, index) => {
              const Icon = stat.icon;
              const colorClasses = {
                blue: "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400",
                amber: "bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400",
                emerald: "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400",
              }[stat.color];

              return (
                <div key={index} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{stat.label}</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stat.value}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{stat.change}</p>
                    </div>
                    <div className={`p-3 rounded-lg ${colorClasses}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Filters Section */}
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="text"
                    placeholder="Search exams by name, course, location, or venue..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <div className="w-64">
                    <select
                      value={selectedCourse}
                      onChange={(e) => setSelectedCourse(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {uniqueCourses.map((course) => (
                        <option key={course} value={course}>
                          {course === "all" ? "All Courses" : course}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <Filter className="w-4 h-4" />
                    <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? "rotate-180" : ""}`} />
                  </button>
                  <button
                    onClick={fetchExamSchedules}
                    className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    title="Refresh"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Advanced Filters */}
              {showFilters && (
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {[
                      { label: "Date Range", options: ["All Dates", "Today", "This Week", "This Month", "Custom Range"] },
                      { label: "Location", options: ["All Locations", "Main Campus", "East Campus", "City Center"] },
                      { label: "Status", options: ["All", "Upcoming", "Ongoing", "Completed"] },
                    ].map((filter) => (
                      <div key={filter.label}>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          {filter.label}
                        </label>
                        <select className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500">
                          {filter.options.map((opt) => <option key={opt}>{opt}</option>)}
                        </select>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Results Summary */}
            <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
              <div className="flex justify-between items-center">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Showing <span className="font-medium text-gray-900 dark:text-white">{filteredExams.length}</span> exams
                  {searchTerm && <> matching "<span className="font-medium">{searchTerm}</span>"</>}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Last updated: {new Date().toLocaleTimeString()}
                </p>
              </div>
            </div>

            {/* Exam Table */}
            {loading ? (
              <div className="p-12 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent"></div>
                <p className="mt-4 text-gray-500 dark:text-gray-400">Loading exam schedules...</p>
              </div>
            ) : filteredExams.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                  <Calendar className="w-8 h-8 text-gray-400 dark:text-gray-500" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">No exams found</h3>
                <p className="text-gray-500 dark:text-gray-400 mb-4">Try adjusting your search or filters</p>
                <button className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                  <Plus className="w-4 h-4" />
                  Create New Exam
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
                      {["Exam Details", "Course", "Date & Time", "Duration", "Location", "Venue", "Status"].map((h) => (
                        <th key={h} className="text-left py-3 px-6 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {filteredExams.map((exam) => {
                      const localTodayStr = new Date().toLocaleDateString('en-CA');
                      const isToday = exam.examDate === localTodayStr;
                      const isUpcoming = exam.examDate > localTodayStr;

                      return (
                        <tr key={exam._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                          <td className="py-4 px-6">
                            <div className="flex items-center">
                              <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg mr-3">
                                <BookOpen className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                              </div>
                              <div>
                                <p className="font-medium text-gray-900 dark:text-white">{exam.examName}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">ID: {exam._id.slice(-6)}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
                              {exam.course}
                            </span>
                          </td>
                          <td className="py-4 px-6">
                            <div className="space-y-1">
                              <div className="flex items-center text-sm text-gray-900 dark:text-white">
                                <Calendar className="w-3.5 h-3.5 text-gray-400 mr-1.5" />
                                {new Date(exam.examDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })}
                              </div>
                              <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                                <Clock className="w-3.5 h-3.5 text-gray-400 mr-1.5" />
                                {exam.startTime} - {exam.endTime}
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
                              {calculateDuration(exam.startTime, exam.endTime)}
                            </span>
                          </td>
                          <td className="py-4 px-6">
                            <div className="flex items-center text-sm text-gray-900 dark:text-white">
                              <MapPin className="w-3.5 h-3.5 text-gray-400 mr-1.5" />
                              {exam.location}
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            <div className="flex items-center text-sm text-gray-900 dark:text-white">
                              <Building2 className="w-3.5 h-3.5 text-gray-400 mr-1.5" />
                              {exam.venue}
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            {isToday ? (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1.5"></span>
                                Today
                              </span>
                            ) : isUpcoming ? (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mr-1.5"></span>
                                Upcoming
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                                <span className="w-1.5 h-1.5 rounded-full bg-gray-400 mr-1.5"></span>
                                Completed
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Table Footer */}
            {!loading && filteredExams.length > 0 && (
              <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Showing {filteredExams.length} of {examSchedules.length} exams
                  </p>
                  <div className="flex items-center gap-2">
                    <button className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50" disabled>
                      Previous
                    </button>
                    <span className="px-3 py-1 bg-blue-600 text-white rounded-md text-sm">1</span>
                    <button className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700">
                      Next
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "Schedule New Exam", icon: Plus, color: "blue" },
              { label: "View Calendar", icon: Calendar, color: "amber" },
              { label: "Generate Reports", icon: Download, color: "emerald" },
              { label: "Room Availability", icon: Building2, color: "purple" },
            ].map((action, index) => {
              const Icon = action.icon;
              const colorClasses = {
                blue: "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50",
                amber: "bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/50",
                emerald: "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/50",
                purple: "bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/50",
              }[action.color];

              return (
                <button
                  key={index}
                  className={`flex items-center justify-center gap-3 p-4 rounded-lg border border-gray-200 dark:border-gray-700 transition-colors ${colorClasses}`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-sm font-medium">{action.label}</span>
                </button>
              );
            })}
          </div>
      </div>
    </>
  );
};

export default ExamSchedule;