import React, { useEffect, useState } from "react";
import { useTheme } from "../context/ThemeContext";
import {
  BookOpen, Search, Filter, ChevronDown, X, Users, Calendar,
  Clock, Award, Building2, UserCircle, Eye, PlusCircle,
  Grid3x3, List, Download,
} from "lucide-react";
import api from "../api/axios";
import { extractArray } from "../utils/apiHelpers";
import { addRecentHistory } from "../api/history";
import { trackView } from "../utils/trackView";

interface Course {
  _id: string;
  name: string;
  code: string;
  department?: string;
  semester?: number;
  credits?: number;
  instructor?: string;
  teacher?: any;
  duration?: string;
  enrolled?: number;
  capacity?: number;
  status?: 'active' | 'inactive';
}

const Courses: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        setLoading(true);
        const response = await api.get("/courses/all");
        setCourses(extractArray(response.data));
      } catch (error) {
        console.error("Error fetching courses:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchCourses();
  }, []);

  // Helper to get instructor/teacher name (server populates `teacher`)
  const getInstructorName = (course: Course) => {
    if (course.instructor) return course.instructor;
    if (course.teacher && typeof course.teacher === 'object') return course.teacher.name;
    if (course.teacher && typeof course.teacher === 'string') return course.teacher;
    return "";
  };

  const handleViewDetails = (course: Course) => {
    trackView("Course", course._id);
    addRecentHistory({
      entityType: "Course",
      entityId: course._id,
      displayName: course.name,
      url: `/courses` // Update this to actual course route if it exists, like `/courses/${course._id}`
    }).catch(console.error);
    // You could also navigate or open modal here
  };

  // Filter and search courses
  const filteredCourses = courses.filter((course: Course) => {
    const instructorName = getInstructorName(course).toLowerCase();
    const matchesSearch =
      course.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      course.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      instructorName.includes(searchTerm.toLowerCase());

    if (filter === "all") return matchesSearch;
    if (filter === "active") return matchesSearch && course.status === 'active';
    if (filter === "inactive") return matchesSearch && course.status === 'inactive';

    return matchesSearch && course.department === filter;
  });

  const departments = Array.from(
    new Set(courses.map((course: Course) => course.department).filter(Boolean)),
  );

  const stats = {
    total: courses.length,
    departments: departments.length,
    active: courses.filter(c => c.status === 'active').length,
    totalCredits: courses.reduce((acc, course) => acc + (course.credits || 0), 0),
  };

  return (
    <div className="space-y-6 p-10 bg-gray-50 dark:bg-gray-950 min-h-screen">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Course Catalog</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Browse and manage all available courses</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="inline-flex items-center gap-2 px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              <Download className="w-4 h-4" />
              Export
            </button>
            <button className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              <PlusCircle className="w-4 h-4" />
              Add Course
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Courses", value: stats.total, icon: BookOpen, bg: "bg-blue-50 dark:bg-blue-900/30", color: "text-blue-600 dark:text-blue-400" },
          { label: "Departments", value: stats.departments, icon: Building2, bg: "bg-amber-50 dark:bg-amber-900/30", color: "text-amber-600 dark:text-amber-400" },
          { label: "Active Courses", value: stats.active, icon: Award, bg: "bg-emerald-50 dark:bg-emerald-900/30", color: "text-emerald-600 dark:text-emerald-400" },
          { label: "Total Credits", value: stats.totalCredits, icon: Award, bg: "bg-purple-50 dark:bg-purple-900/30", color: "text-purple-600 dark:text-purple-400" },
        ].map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div key={i} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
              <div className="flex items-center gap-3">
                <div className={`p-3 ${stat.bg} rounded-lg`}>
                  <Icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{stat.label}</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Filters and Search */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search courses by name, code, or instructor..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg border transition-colors ${
                viewMode === 'grid'
                  ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700 text-blue-600 dark:text-blue-400'
                  : 'border-gray-300 dark:border-gray-600 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
              }`}
            >
              <Grid3x3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg border transition-colors ${
                viewMode === 'list'
                  ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700 text-blue-600 dark:text-blue-400'
                  : 'border-gray-300 dark:border-gray-600 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
              }`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <Filter className="w-4 h-4" />
            Filters
            <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>

          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <X className="w-4 h-4" />
              Clear
            </button>
          )}
        </div>

        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                {
                  label: "Department", isMain: true,
                },
                { label: "Credits", options: ["All Credits", "1-2 Credits", "3-4 Credits", "5+ Credits"] },
                { label: "Semester", options: ["All Semesters", "Semester 1", "Semester 2", "Semester 3", "Semester 4", "Semester 5", "Semester 6"] },
              ].map((f) => (
                <div key={f.label}>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{f.label}</label>
                  {f.isMain ? (
                    <select
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={filter}
                      onChange={(e) => setFilter(e.target.value)}
                    >
                      <option value="all">All Departments</option>
                      <option value="active">Active Courses</option>
                      <option value="inactive">Inactive Courses</option>
                      <optgroup label="By Department">
                        {departments.map((dept) => <option key={dept} value={dept}>{dept}</option>)}
                      </optgroup>
                    </select>
                  ) : (
                    <select className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500">
                      {f.options!.map((opt) => <option key={opt}>{opt}</option>)}
                    </select>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Results Count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Showing <span className="font-medium text-gray-900 dark:text-white">{filteredCourses.length}</span> of{" "}
          <span className="font-medium text-gray-900 dark:text-white">{courses.length}</span> courses
        </p>
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-12">
          <div className="flex flex-col items-center justify-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent"></div>
            <p className="mt-4 text-gray-500 dark:text-gray-400">Loading courses...</p>
          </div>
        </div>
      ) : filteredCourses.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-12">
          <div className="text-center max-w-md mx-auto">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              <BookOpen className="w-8 h-8 text-gray-400 dark:text-gray-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No courses found</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              {searchTerm ? `No courses match "${searchTerm}"` : "No courses are available at the moment"}
            </p>
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <X className="w-4 h-4" />
                Clear Search
              </button>
            )}
          </div>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCourses.map((course: Course) => (
            <div
              key={course._id}
              className="group bg-white rounded-xl border border-gray-200 hover:border-blue-200 hover:shadow-lg transition-all overflow-hidden"
            >
              <div className="relative p-5 bg-gradient-to-br from-gray-50 dark:from-gray-800 to-white dark:to-gray-900 border-b border-gray-100 dark:border-gray-700">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-lg bg-blue-600 flex items-center justify-center shrink-0">
                    <span className="text-white font-bold text-lg">{course.code.substring(0, 2)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {course.name}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 font-mono">{course.code}</p>
                  </div>
                  <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${
                    course.status === 'active'
                      ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full mr-1 ${course.status === 'active' ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                    {course.status || 'active'}
                  </span>
                </div>
              </div>

              <div className="p-5">
                <div className="space-y-3">
                  {course.department && (
                    <div className="flex items-center text-sm">
                      <Building2 className="w-4 h-4 text-gray-400 dark:text-gray-500 mr-2" />
                      <span className="text-gray-600 dark:text-gray-400">{course.department}</span>
                    </div>
                  )}

                  {getInstructorName(course) && (
                    <div className="flex items-center text-sm">
                      <UserCircle className="w-4 h-4 text-gray-400 mr-2" />
                      <span className="text-gray-600">{getInstructorName(course)}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-4">
                    {course.semester && (
                      <div className="flex items-center text-sm">
                        <Calendar className="w-4 h-4 text-gray-400 dark:text-gray-500 mr-1" />
                        <span className="text-gray-600 dark:text-gray-400">Sem {course.semester}</span>
                      </div>
                    )}
                    {course.credits && (
                      <div className="flex items-center text-sm">
                        <Award className="w-4 h-4 text-gray-400 dark:text-gray-500 mr-1" />
                        <span className="text-gray-600 dark:text-gray-400">{course.credits} Credits</span>
                      </div>
                    )}
                  </div>
                  {(course.enrolled !== undefined || course.capacity) && (
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center">
                        <Users className="w-4 h-4 text-gray-400 dark:text-gray-500 mr-1" />
                        <span className="text-gray-600 dark:text-gray-400">
                          {course.enrolled || 0}/{course.capacity || 30} enrolled
                        </span>
                      </div>
                      {course.enrolled !== undefined && course.capacity && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {Math.round((course.enrolled / course.capacity) * 100)}% full
                        </span>
                      )}
                    </div>
                  )}
                  {course.duration && (
                    <div className="flex items-center text-sm">
                      <Clock className="w-4 h-4 text-gray-400 dark:text-gray-500 mr-1" />
                      <span className="text-gray-600 dark:text-gray-400">{course.duration}</span>
                    </div>
                  )}
                </div>

                <div className="mt-5 pt-4 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
                  <button onClick={() => handleViewDetails(course)} className="inline-flex items-center text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                    <Eye className="w-4 h-4 mr-1" />
                    Details
                  </button>
                  <button className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-lg text-sm font-medium hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors">
                    <PlusCircle className="w-4 h-4" />
                    Enroll
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  {["Course", "Department", "Instructor", "Semester", "Credits", "Status", "Actions"].map((h) => (
                    <th key={h} className={`px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider ${h === "Actions" ? "text-right" : "text-left"}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredCourses.map((course) => (
                        <tr key={course._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900 dark:text-white">{course.name}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">{course.code}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{course.department || '—'}</td>
                          <td className="px-6 py-4 text-sm text-gray-600">{getInstructorName(course) || '—'}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{course.semester || '—'}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{course.credits || '—'}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${
                        course.status === 'active'
                          ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${course.status === 'active' ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                        {course.status || 'active'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => handleViewDetails(course)} className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium text-sm">
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Courses;