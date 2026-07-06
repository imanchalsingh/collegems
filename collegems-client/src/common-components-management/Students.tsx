import React, { useState, useEffect } from "react";
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
  ChevronLeft,
} from "lucide-react";
import api from "../api/axios";
import { NavLink, useNavigate } from "react-router-dom";
import { useServerDataTable } from "../hooks/useServerDataTable";
import AdvancedExportButton from "./AdvancedExportButton";
import EmptyState from "../components/EmptyState";
import BulkTagModal from "./BulkTagModal";
import CompareStudentsModal, { type Student as CompareStudent } from "./CompareStudentsModal";
import StudentTimeline from "./StudentTimeline";
import { trackView } from "../utils/trackView";

interface Student {
  _id?: string;
  name: string;
  email: string;
  role: string;
  studentId: string;
  course?: string;
  semester?: number;
  phone?: string;
  department?: string;
  tags?: string[];
  joinedAt?: string;
  lastUpdated?: string;
}

const Students: React.FC = () => {
  const navigate = useNavigate();
  const { data, isLoading, isError, refetch, tableState, actions } =
    useServerDataTable({
      endpoint: "/users/students",
      queryKey: ["students"],
      defaultPageSize: 12,
    });

  const students = data?.data || [];
  const meta = data?.meta || { totalRecords: 0, currentPage: 1, totalPages: 1, hasNextPage: false, hasPrevPage: false };
  const hasActiveFilters = Boolean(tableState.search) || Object.keys(tableState.filters).length > 0;
  const showCreateCta = !hasActiveFilters && meta.totalRecords === 0;

  // Debounced search state
  const [searchInput, setSearchInput] = useState(tableState.search);
  useEffect(() => {
    const handler = setTimeout(() => {
      actions.setSearch(searchInput);
    }, 500);
    return () => clearTimeout(handler);
  }, [searchInput]);

  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [fullProfile, setFullProfile] = useState<Student | null>(null);
  const [fetchingProfile, setFetchingProfile] = useState(false);
  const [profileError, setProfileError] = useState("");

  const [selectedForCompare, setSelectedForCompare] = useState<Student[]>([]);
  const [showCompareModal, setShowCompareModal] = useState(false);
  const [showTagModal, setShowTagModal] = useState(false);

  const handleCompareToggle = (student: Student, e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    if (e.target.checked) {
      setSelectedForCompare((prev) => {
        if (prev.some((s) => s._id === student._id)) return prev;
        return [...prev, student];
      });
    } else {
      setSelectedForCompare((prev) => prev.filter((s) => s._id !== student._id));
    }
  };

  const handleViewProfile = async (id: string | undefined) => {
    if (!id) return;
    try {
      setFetchingProfile(true);
      setProfileError("");
      const res = await api.get(`/users/students/${id}`);
      setFullProfile(res.data);
      trackView("Student", id);
    } catch (error) {
      console.error("Error fetching full profile:", error);
      setProfileError("Could not fetch student profile. Data unavailable.");
    } finally {
      setFetchingProfile(false);
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return "ST";
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

  const studentHeaders = ["Name", "Email", "Student ID", "Course", "Semester", "Department", "Joined Date"];
  const studentMapper = (student: Student) => [
    student.name || "N/A",
    student.email || "N/A",
    student.studentId || "N/A",
    student.course || "N/A",
    student.semester?.toString() || "N/A",
    student.department || "N/A",
    formatDate(student.joinedAt)
  ];

  return (
    <div className="space-y-6">
      {/* Stats Cards - Simplified since we only have server data now */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-50 rounded-lg">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Students</p>
              <p className="text-xl font-bold text-gray-900">{meta.totalRecords}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-50 rounded-lg">
              <BookOpen className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Active Page</p>
              <p className="text-xl font-bold text-gray-900">Page {meta.currentPage} of {meta.totalPages || 1}</p>
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
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`inline-flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors ${Object.keys(tableState.filters).length > 0
                  ? "border-blue-500 text-blue-600 bg-blue-50"
                  : "border-gray-300 text-gray-700 hover:bg-gray-50"
                  }`}
              >
                <Filter className="w-4 h-4" />
                Filters
              </button>
              <button
                onClick={() => refetch()}
                className="p-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                title="Refresh"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
              <AdvancedExportButton
                data={students}
                filename="Students_Export"
                pdfTitle="Students Report"
                headers={studentHeaders}
                dataMapper={studentMapper}
              />
            </div>
          </div>

          {/* Expanded Filters */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Course
                  </label>
                  <select
                    value={tableState.filters.course || "all"}
                    onChange={(e) => actions.setFilter("course", e.target.value)}
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
                    value={tableState.filters.semester || "all"}
                    onChange={(e) => actions.setFilter("semester", e.target.value)}
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
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Department
                  </label>
                  <select
                    value={tableState.filters.department || "all"}
                    onChange={(e) => actions.setFilter("department", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Departments</option>
                    <option value="Computer Science">Computer Science</option>
                    <option value="Business">Business</option>
                    <option value="Mathematics">Mathematics</option>
                    <option value="Physics">Physics</option>
                    <option value="Engineering">Engineering</option>
                    <option value="Arts">Arts</option>
                    <option value="unassigned">Unassigned</option>
                  </select>
                </div>
                <div>
                  <button
                    onClick={() => {
                      actions.clearFilters();
                      setSearchInput("");
                    }}
                    className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:underline"
                  >
                    Clear All
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Error State */}
      {isError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">
          <p>Error loading students. Please try again.</p>
        </div>
      )}

      {/* Loading State */}
      {isLoading ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12">
          <div className="flex flex-col items-center justify-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent"></div>
            <p className="mt-4 text-gray-500">Loading students data...</p>
          </div>
        </div>
      ) : (
        <>
          {/* Students Grid/List */}
          {!isError && students.length === 0 ? (
            showCreateCta ? (
              <EmptyState
                icon={<Users className="w-7 h-7 text-blue-600" />}
                title="No students yet"
                description="Create the first student record to start building your roster."
                actionLabel="Create First Student"
                onAction={() => navigate("/register")}
                actionHint="Opens the registration page for a new student account."
              />
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-1">
                  No students found
                </h3>
                <p className="text-gray-500">Try adjusting your search or filters.</p>
              </div>
            )
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {students.map((student: Student) => (
                <div
                  key={student.studentId}
                  className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow group"
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <div className="flex flex-col items-center justify-center mt-3 mr-1">
                          <input
                            type="checkbox"
                            checked={selectedForCompare.some((s) => s._id === student._id)}
                            onChange={(e) => handleCompareToggle(student, e)}
                            className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
                            title="Select for comparison"
                          />
                        </div>
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
                          {student.tags && student.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {student.tags.map((tag) => (
                                <span key={tag} className="px-2 py-0.5 bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 rounded text-[10px] font-medium border border-indigo-100 dark:border-indigo-800">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
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

      {/* Pagination Controls */}
      {!isLoading && !isError && meta.totalPages > 1 && (
        <div className="flex items-center justify-between bg-white px-4 py-3 border border-gray-200 rounded-xl sm:px-6">
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Showing page <span className="font-medium">{meta.currentPage}</span> of <span className="font-medium">{meta.totalPages}</span>
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                <button
                  onClick={() => actions.setPage(meta.currentPage - 1)}
                  disabled={!meta.hasPrevPage}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="sr-only">Previous</span>
                  <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                </button>
                {/* Simplified page numbers, could be expanded for many pages */}
                <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                  {meta.currentPage}
                </span>
                <button
                  onClick={() => actions.setPage(meta.currentPage + 1)}
                  disabled={!meta.hasNextPage}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="sr-only">Next</span>
                  <ChevronRight className="h-5 w-5" aria-hidden="true" />
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}

      {/* Student Detail Modal */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm"
            onClick={() => { setSelectedStudent(null); setFullProfile(null); setProfileError(""); }}
          />
          <div className="relative w-full max-w-lg bg-white rounded-xl shadow-xl overflow-hidden max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="p-6 bg-blue-600">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-white">
                  Student Details
                </h3>
                <button
                  onClick={() => { setSelectedStudent(null); setFullProfile(null); setProfileError(""); }}
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
                    {fullProfile?.name || selectedStudent.name}
                  </h4>
                  <p className="text-gray-500 flex items-center gap-1 mt-1">
                    <Mail className="w-4 h-4" />
                    {fullProfile?.email || selectedStudent.email}
                  </p>
                </div>
              </div>

              {profileError ? (
                <div className="p-4 bg-red-50 text-red-600 rounded-lg mb-4">
                  {profileError}
                </div>
              ) : fetchingProfile ? (
                <div className="flex justify-center p-8">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent"></div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-500 mb-1">Student ID</p>
                      <p className="text-sm font-medium text-gray-900">
                        {fullProfile?.studentId || selectedStudent.studentId || "N/A"}
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
                        {fullProfile?.course || selectedStudent.course || "Not assigned"}
                      </p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-500 mb-1">Semester</p>
                      <p className="text-sm font-medium text-gray-900">
                        {fullProfile?.semester || selectedStudent.semester || "N/A"}
                      </p>
                    </div>
                  </div>

                  {fullProfile && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs text-gray-500 mb-1">Phone</p>
                        <p className="text-sm font-medium text-gray-900">
                          {fullProfile.phone || "N/A"}
                        </p>
                      </div>
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs text-gray-500 mb-1">Department</p>
                        <p className="text-sm font-medium text-gray-900">
                          {fullProfile.department || selectedStudent.department || "N/A"}
                        </p>
                      </div>
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs text-gray-500 mb-1">Role</p>
                        <p className="text-sm font-medium text-gray-900 capitalize">
                          {fullProfile.role}
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-500 mb-1">Joined Date</p>
                      <p className="text-sm font-medium text-gray-900">
                        {formatDate(fullProfile?.joinedAt || selectedStudent.joinedAt)}
                      </p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-500 mb-1">Last Updated</p>
                      <p className="text-sm font-medium text-gray-900">
                        {formatDate(fullProfile?.lastUpdated || selectedStudent.lastUpdated)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 pt-6 border-t border-gray-100">
                    <StudentTimeline studentId={fullProfile?._id || selectedStudent?._id || ""} />
                  </div>
                </div>
              )}

              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => { setSelectedStudent(null); setFullProfile(null); setProfileError(""); }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Close
                </button>
                {!fullProfile && !fetchingProfile && (
                  <button
                    onClick={() => handleViewProfile(selectedStudent._id)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    View Full Profile
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Compare Bar */}
      {selectedForCompare.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 shadow-[0_-10px_20px_-10px_rgba(0,0,0,0.1)] p-4 z-40 flex items-center justify-between px-8 ml-0 md:ml-64 transition-all">
          <div className="flex items-center gap-4">
            <span className="font-medium text-gray-700 dark:text-gray-300 pl-4">Selected: {selectedForCompare.length}</span>
            <div className="flex gap-2">
              {selectedForCompare.map(s => (
                <span key={s._id} className="bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 text-sm px-3 py-1 rounded-full flex items-center gap-2">
                  {s.name}
                  <button onClick={() => setSelectedForCompare(prev => prev.filter(st => st._id !== s._id))} className="hover:text-blue-900 dark:hover:text-blue-100">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setSelectedForCompare([])} className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition">Clear</button>
            <button
              onClick={() => setShowTagModal(true)}
              className="px-6 py-2 border border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 transition shadow-sm"
            >
              Manage Tags
            </button>
            <button
              disabled={selectedForCompare.length !== 2}
              onClick={() => setShowCompareModal(true)}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
            >
              Compare
            </button>
          </div>
        </div>
      )}

      {showCompareModal && (
        <CompareStudentsModal students={selectedForCompare as CompareStudent[]} onClose={() => setShowCompareModal(false)} />
      )}

      {showTagModal && (
        <BulkTagModal
          students={selectedForCompare}
          onClose={() => setShowTagModal(false)}
          onSuccess={() => {
            setSelectedForCompare([]);
            refetch();
          }}
        />
      )}
    </div>
  );
};

export default Students;

