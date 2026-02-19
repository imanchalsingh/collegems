import React, { useState, useEffect } from "react";
import {
  Calendar,
  Clock,
  MapPin,
  BookOpen,
  Search,
  RefreshCw,
  Filter,
  ChevronDown,
  Download,
  Plus,
  Building2,
  GraduationCap,
} from "lucide-react";
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
      setExamSchedules(response.data || []);
    } catch (err: any) {
      console.error("Fetch exam error:", err);
      // Use a more subtle error notification
      console.error(err?.response?.data?.message || "Failed to fetch exam schedules");
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
    const today = new Date();
    return examSchedules.filter((exam) => new Date(exam.examDate) >= today).length;
  };

  const getTodayExams = () => {
    const today = new Date().toDateString();
    return examSchedules.filter(
      (exam) => new Date(exam.examDate).toDateString() === today
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
    <div className="space-y-6 p-10">
      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Exam Schedule Management</h1>
            <p className="text-gray-500 mt-1">Create and manage examination schedules</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="inline-flex items-center gap-2 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
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
            blue: "bg-blue-50 text-blue-600",
            amber: "bg-amber-50 text-amber-600",
            emerald: "bg-emerald-50 text-emerald-600",
          }[stat.color];

          return (
            <div key={index} className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-500">{stat.label}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                  <p className="text-xs text-gray-400 mt-1">{stat.change}</p>
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
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search exams by name, course, location, or venue..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <div className="w-64">
                <select
                  value={selectedCourse}
                  onChange={(e) => setSelectedCourse(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Filter className="w-4 h-4" />
                <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
              </button>
              <button
                onClick={fetchExamSchedules}
                className="p-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                title="Refresh"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Advanced Filters */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date Range
                  </label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option>All Dates</option>
                    <option>Today</option>
                    <option>This Week</option>
                    <option>This Month</option>
                    <option>Custom Range</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Location
                  </label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option>All Locations</option>
                    <option>Main Campus</option>
                    <option>East Campus</option>
                    <option>City Center</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option>All</option>
                    <option>Upcoming</option>
                    <option>Ongoing</option>
                    <option>Completed</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Results Summary */}
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-600">
              Showing <span className="font-medium text-gray-900">{filteredExams.length}</span> exams
              {searchTerm && (
                <> matching "<span className="font-medium">{searchTerm}</span>"</>
              )}
            </p>
            <p className="text-sm text-gray-500">
              Last updated: {new Date().toLocaleTimeString()}
            </p>
          </div>
        </div>

        {/* Exam Table */}
        {loading ? (
          <div className="p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent"></div>
            <p className="mt-4 text-gray-500">Loading exam schedules...</p>
          </div>
        ) : filteredExams.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
              <Calendar className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">No exams found</h3>
            <p className="text-gray-500 mb-4">Try adjusting your search or filters</p>
            <button className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              <Plus className="w-4 h-4" />
              Create New Exam
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left py-3 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Exam Details
                  </th>
                  <th className="text-left py-3 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Course
                  </th>
                  <th className="text-left py-3 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date & Time
                  </th>
                  <th className="text-left py-3 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Duration
                  </th>
                  <th className="text-left py-3 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Location
                  </th>
                  <th className="text-left py-3 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Venue
                  </th>
                  <th className="text-left py-3 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredExams.map((exam) => {
                  const examDate = new Date(exam.examDate);
                  const today = new Date();
                  const isToday = examDate.toDateString() === today.toDateString();
                  const isUpcoming = examDate > today;
                  
                  return (
                    <tr key={exam._id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-4 px-6">
                        <div className="flex items-center">
                          <div className="p-2 bg-blue-50 rounded-lg mr-3">
                            <BookOpen className="w-4 h-4 text-blue-600" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{exam.examName}</p>
                            <p className="text-xs text-gray-500">ID: {exam._id.slice(-6)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700">
                          {exam.course}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <div className="space-y-1">
                          <div className="flex items-center text-sm text-gray-900">
                            <Calendar className="w-3.5 h-3.5 text-gray-400 mr-1.5" />
                            {examDate.toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </div>
                          <div className="flex items-center text-xs text-gray-500">
                            <Clock className="w-3.5 h-3.5 text-gray-400 mr-1.5" />
                            {exam.startTime} - {exam.endTime}
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-amber-50 text-amber-700">
                          {calculateDuration(exam.startTime, exam.endTime)}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center text-sm text-gray-900">
                          <MapPin className="w-3.5 h-3.5 text-gray-400 mr-1.5" />
                          {exam.location}
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center text-sm text-gray-900">
                          <Building2 className="w-3.5 h-3.5 text-gray-400 mr-1.5" />
                          {exam.venue}
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        {isToday ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-green-50 text-green-700">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1.5"></span>
                            Today
                          </span>
                        ) : isUpcoming ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mr-1.5"></span>
                            Upcoming
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-700">
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
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">
                Showing {filteredExams.length} of {examSchedules.length} exams
              </p>
              <div className="flex items-center gap-2">
                <button className="px-3 py-1 border border-gray-300 rounded-md text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50" disabled>
                  Previous
                </button>
                <span className="px-3 py-1 bg-blue-600 text-white rounded-md text-sm">1</span>
                <button className="px-3 py-1 border border-gray-300 rounded-md text-sm text-gray-600 hover:bg-gray-50">
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
            blue: "bg-blue-50 text-blue-600 hover:bg-blue-100",
            amber: "bg-amber-50 text-amber-600 hover:bg-amber-100",
            emerald: "bg-emerald-50 text-emerald-600 hover:bg-emerald-100",
            purple: "bg-purple-50 text-purple-600 hover:bg-purple-100",
          }[action.color];

          return (
            <button
              key={index}
              className={`flex items-center justify-center gap-3 p-4 rounded-lg border border-gray-200 transition-colors ${colorClasses}`}
            >
              <Icon className="w-4 h-4" />
              <span className="text-sm font-medium">{action.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default ExamSchedule;