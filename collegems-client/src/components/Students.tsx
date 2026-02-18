import React, { useEffect, useState } from "react";
import {
  Users,
  Search,
  RefreshCw,
  X,
  ChevronRight,
  Mail,
  IdCard,
  Calendar,
  GraduationCap,
  BookOpen,
  Filter,
  MoreVertical,
} from "lucide-react";
import api from "../api/axios";

interface Student {
  name: string;
  email: string;
  role: string;
  studentId: string;
  course?: string;
  semester?: number;
  joinedAt?: string;
  lastUpdated?: string;
}

const Students: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [filterCourse, setFilterCourse] = useState<string>("all");
  const [filterSemester, setFilterSemester] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchStudents();
  }, []);

  useEffect(() => {
    const filtered = students.filter(
      (student) =>
        (student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          student.studentId.toLowerCase().includes(searchTerm.toLowerCase()) ||
          student.email.toLowerCase().includes(searchTerm.toLowerCase())) &&
        (filterCourse === "all" || student.course === filterCourse) &&
        (filterSemester === "all" ||
          student.semester?.toString() === filterSemester),
    );
    setFilteredStudents(filtered);
  }, [searchTerm, students, filterCourse, filterSemester]);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const response = await api.get("/users/students");
      // Add mock data for demonstration (remove when actual data is available)
      const enrichedData = response.data.map(
        (student: Student, index: number) => ({
          ...student,
          course: student.course || ["BCA", "BBA", "MCA", "MBA"][index % 4],
          semester: student.semester || (index % 8) + 1,
          joinedAt:
            student.joinedAt ||
            new Date(2024, index % 12, (index % 28) + 1).toISOString(),
          lastUpdated: student.lastUpdated || new Date().toISOString(),
        }),
      );
      setStudents(enrichedData);
      setFilteredStudents(enrichedData);
    } catch (error) {
      console.error("Error fetching students:", error);
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getCourseColor = (course?: string) => {
    const colors: Record<string, string> = {
      BCA: "bg-blue-100 text-blue-700",
      BBA: "bg-amber-100 text-amber-700",
      MCA: "bg-purple-100 text-purple-700",
      MBA: "bg-emerald-100 text-emerald-700",
    };
    return course
      ? colors[course] || "bg-gray-100 text-gray-700"
      : "bg-gray-100 text-gray-700";
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const stats = {
    total: students.length,
    active: students.length,
    newThisMonth: students.filter((s) => {
      if (!s.joinedAt) return false;
      const joinDate = new Date(s.joinedAt);
      const now = new Date();
      return (
        joinDate.getMonth() === now.getMonth() &&
        joinDate.getFullYear() === now.getFullYear()
      );
    }).length,
    courses: new Set(students.map((s) => s.course).filter(Boolean)).size,
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-50 rounded-lg">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Students</p>
              <p className="text-xl font-bold text-gray-900">{stats.total}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-50 rounded-lg">
              <Users className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Active Students</p>
              <p className="text-xl font-bold text-gray-900">{stats.active}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-50 rounded-lg">
              <Calendar className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">New This Month</p>
              <p className="text-xl font-bold text-gray-900">
                {stats.newThisMonth}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-50 rounded-lg">
              <BookOpen className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Courses</p>
              <p className="text-xl font-bold text-gray-900">{stats.courses}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                size={18}
              />
              <input
                type="text"
                placeholder="Search students by name, ID, or email..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Filter className="w-4 h-4" />
                Filters
              </button>
              <button
                onClick={fetchStudents}
                className="p-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                title="Refresh"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Expanded Filters */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Course
                  </label>
                  <select
                    value={filterCourse}
                    onChange={(e) => setFilterCourse(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Courses</option>
                    <option value="BCA">BCA</option>
                    <option value="BBA">BBA</option>
                    <option value="MCA">MCA</option>
                    <option value="MBA">MBA</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Semester
                  </label>
                  <select
                    value={filterSemester}
                    onChange={(e) => setFilterSemester(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Semesters</option>
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
                      <option key={sem} value={sem}>
                        Semester {sem}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12">
          <div className="flex flex-col items-center justify-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent"></div>
            <p className="mt-4 text-gray-500">Loading students data...</p>
          </div>
        </div>
      ) : (
        <>
          {/* Students Grid/List */}
          {filteredStudents.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-1">
                No students found
              </h3>
              <p className="text-gray-500">
                {searchTerm ||
                filterCourse !== "all" ||
                filterSemester !== "all"
                  ? "Try adjusting your search or filters"
                  : "No students registered yet"}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredStudents.map((student) => (
                <div
                  key={student.studentId}
                  className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow group"
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-lg">
                          {getInitials(student.name)}
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                            {student.name}
                          </h3>
                          <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                            <Mail className="w-3 h-3" />
                            {student.email}
                          </p>
                        </div>
                      </div>
                      <button className="p-1 hover:bg-gray-100 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                        <MoreVertical className="w-4 h-4 text-gray-500" />
                      </button>
                    </div>

                    <div className="mt-4 space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <IdCard className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-600">
                          ID: {student.studentId}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <GraduationCap className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-600">
                          {student.course || "Course not set"}
                        </span>
                        <span className="text-gray-400">·</span>
                        <span className="text-gray-600">
                          Sem {student.semester || "N/A"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-600">
                          Joined {formatDate(student.joinedAt)}
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <div className="flex items-center justify-between">
                        <span
                          className={`px-2 py-1 rounded-md text-xs font-medium ${getCourseColor(student.course)}`}
                        >
                          {student.course || "No Course"}
                        </span>
                        <button
                          onClick={() => setSelectedStudent(student)}
                          className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                        >
                          View Details
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Student Count */}
      <div className="text-sm text-gray-500 text-center">
        Showing {filteredStudents.length} of {students.length} students
        {(searchTerm || filterCourse !== "all" || filterSemester !== "all") &&
          " (filtered)"}
      </div>

      {/* Student Detail Modal */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm"
            onClick={() => setSelectedStudent(null)}
          />
          <div className="relative w-full max-w-lg bg-white rounded-xl shadow-xl overflow-hidden">
            {/* Header */}
            <div className="p-6 bg-blue-600">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-white">
                  Student Details
                </h3>
                <button
                  onClick={() => setSelectedStudent(null)}
                  className="text-white/80 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-2xl">
                  {getInitials(selectedStudent.name)}
                </div>
                <div>
                  <h4 className="text-xl font-semibold text-gray-900">
                    {selectedStudent.name}
                  </h4>
                  <p className="text-gray-500 flex items-center gap-1 mt-1">
                    <Mail className="w-4 h-4" />
                    {selectedStudent.email}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500 mb-1">Student ID</p>
                    <p className="text-sm font-medium text-gray-900">
                      {selectedStudent.studentId}
                    </p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500 mb-1">Status</p>
                    <p className="text-sm font-medium text-green-600 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-600"></span>
                      Active
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500 mb-1">Course</p>
                    <p className="text-sm font-medium text-gray-900">
                      {selectedStudent.course || "Not assigned"}
                    </p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500 mb-1">Semester</p>
                    <p className="text-sm font-medium text-gray-900">
                      {selectedStudent.semester || "N/A"}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500 mb-1">Joined Date</p>
                    <p className="text-sm font-medium text-gray-900">
                      {formatDate(selectedStudent.joinedAt)}
                    </p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500 mb-1">Last Updated</p>
                    <p className="text-sm font-medium text-gray-900">
                      {formatDate(selectedStudent.lastUpdated)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => setSelectedStudent(null)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Close
                </button>
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                  View Full Profile
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Students;
