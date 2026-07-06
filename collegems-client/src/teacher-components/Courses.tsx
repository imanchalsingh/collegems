import { useEffect, useState } from "react";
import api from "../api/axios";
import { extractArray } from "../utils/apiHelpers";
import { useTheme } from "../context/ThemeContext";

import {
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  BookOpen,
  Building,
  Calendar,
  Users,
  X,
  ChevronDown,
  Award,
  Moon,
  Sun,
  Download,
} from "lucide-react";

interface Course {
  _id: string;
  name: string;
  code: string;
  department: string;
  semester: number;
  credits?: number;
  description?: string;
  maxStudents?: number;
}

export default function Courses() {
  const { darkMode, toggleTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [department, setDepartment] = useState("");
  const [semester, setSemester] = useState("");
  const [credits, setCredits] = useState("");
  const [description, setDescription] = useState("");
  const [maxStudents, setMaxStudents] = useState("");

  const currentUser = JSON.parse(localStorage.getItem("userData") || "null");
  const teacherId = currentUser?.id || currentUser?._id || "";

  // Departments and semesters
  const departments = [
    "Computer Science", "Electrical", "Mechanical", "Civil",
    "Electronics", "Mathematics", "Physics", "Chemistry",
  ];
  const semesters = [1, 2, 3, 4, 5, 6, 7, 8];

  const fetchCourses = async () => {
    try {
      setLoading(true);
      const res = await api.get("/courses/all");
      setCourses(extractArray(res.data));
    } catch (error) {
      console.error("Error fetching courses:", error);
      alert("Failed to load courses");
    } finally {
      setLoading(false);
    }
  };

  const deleteCourse = async (courseId: string) => {
    if (!window.confirm("Are you sure you want to delete this course?")) return;
    try {
      await api.delete(`/courses/delete/${courseId}`);
      alert("Course deleted successfully");
      fetchCourses();
    } catch (error) {
      console.log(error);
      alert("Failed to delete course");
    }
  };

  useEffect(() => { fetchCourses(); }, []);

  const resetForm = () => {
    setName(""); setCode(""); setDepartment(""); setSemester("");
    setCredits(""); setDescription(""); setMaxStudents(""); setEditingCourse(null);
  };

  const handleOpenModal = (course: Course | null = null) => {
    if (course) {
      setEditingCourse(course);
      setName(course.name); setCode(course.code);
      setDepartment(course.department); setSemester(course.semester.toString());
      setCredits(course.credits?.toString() || "");
      setDescription(course.description || "");
      setMaxStudents(course.maxStudents?.toString() || "");
    } else {
      resetForm();
    }
    setOpen(true);
  };

  const addOrUpdateCourse = async () => {
    if (!name || !code || !department || !semester) {
      alert("Please fill all required fields");
      return;
    }
    try {
      const courseData = {
        name, code, department,
        semester: Number(semester),
        teacher: teacherId,
        credits: credits ? Number(credits) : 3,
        description,
        maxStudents: maxStudents ? Number(maxStudents) : 60,
      };
      if (editingCourse) {
        await api.put(`/courses/update/${editingCourse._id}`, courseData);
        alert("Course updated successfully ✅");
      } else {
        await api.post("/courses/add", courseData);
        alert("Course added successfully ✅");
      }
      setOpen(false);
      resetForm();
      fetchCourses();
    } catch (err: any) {
      alert(err?.response?.data?.message || "Error saving course");
    }
  };

  const filteredCourses = courses.filter((course) => {
    if (filter !== "all" && course.department !== filter) return false;
    if (search) {
      const s = search.toLowerCase();
      return (
        course.name.toLowerCase().includes(s) ||
        course.code.toLowerCase().includes(s) ||
        course.department.toLowerCase().includes(s)
      );
    }
    return true;
  });

  const stats = {
    totalCourses: courses.length,
    totalDepartments: new Set(courses.map((c) => c.department)).size,
    totalSemesters: new Set(courses.map((c) => c.semester)).size,
    avgCredits: courses.length > 0
      ? (courses.reduce((sum, c) => sum + (c.credits || 3), 0) / courses.length).toFixed(1)
      : "0",
  };

  const cardCls = "bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5";
  const inputCls = "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-700 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent";
  const selectCls = "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors">
      {/* ── Page Header ── */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-6 py-4 sticky top-0 z-20">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Course Catalog</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Browse and manage all available courses
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Dark / Light toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title={darkMode ? "Switch to light mode" : "Switch to dark mode"}
            >
              {darkMode
                ? <Sun className="w-5 h-5 text-yellow-400" />
                : <Moon className="w-5 h-5 text-gray-600" />}
            </button>

            {/* Export button */}
            <button className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm font-medium">
              <Download className="w-4 h-4" />
              Export
            </button>

            {/* Add Course button */}
            <button
              onClick={() => handleOpenModal()}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              Add Course
            </button>
          </div>
        </div>
      </div>

      {/* ── Page Body ── */}
      <div className="p-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className={cardCls}>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                <BookOpen className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Courses</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalCourses}</p>
              </div>
            </div>
          </div>

          <div className={cardCls}>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-amber-50 dark:bg-amber-900/30 rounded-lg">
                <Building className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Departments</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalDepartments}</p>
              </div>
            </div>
          </div>

          <div className={cardCls}>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg">
                <Calendar className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Active Semesters</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalSemesters}</p>
              </div>
            </div>
          </div>

          <div className={cardCls}>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-50 dark:bg-purple-900/30 rounded-lg">
                <Award className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Avg. Credits</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.avgCredits}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                className={`${inputCls} pl-10`}
                placeholder="Search by name, code, or department..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
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
          </div>

          {showFilters && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Department</label>
                  <select className={selectCls} value={filter} onChange={(e) => setFilter(e.target.value)}>
                    <option value="all">All Departments</option>
                    {departments.map((dept) => <option key={dept} value={dept}>{dept}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Semester</label>
                  <select className={selectCls}>
                    <option value="all">All Semesters</option>
                    {semesters.map((sem) => <option key={sem} value={sem}>Semester {sem}</option>)}
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Courses Grid */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">All Courses</h2>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Showing {filteredCourses.length} of {courses.length} courses
            </span>
          </div>

          {loading ? (
            <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent"></div>
              <p className="mt-2 text-gray-500 dark:text-gray-400">Loading courses...</p>
            </div>
          ) : filteredCourses.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                <BookOpen className="h-8 w-8 text-gray-400 dark:text-gray-500" />
              </div>
              <p className="text-gray-600 dark:text-gray-300 font-medium mb-1">No courses found</p>
              <p className="text-sm text-gray-500 dark:text-gray-500 mb-4">
                {search || filter !== "all" ? "Try adjusting your search or filters" : "No courses are available at the moment"}
              </p>
              {!(search || filter !== "all") && (
                <button
                  onClick={() => handleOpenModal()}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-4 h-4" /> Add your first course
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCourses.map((course) => (
                <div
                  key={course._id}
                  className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-lg transition-all group"
                >
                  <div className="p-5 border-b border-gray-100 dark:border-gray-700">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="px-2 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs font-medium rounded-md">
                            {course.code}
                          </span>
                          <span className={`px-2 py-1 text-xs font-medium rounded-md ${
                            course.credits && course.credits > 4
                              ? "bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"
                              : "bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                          }`}>
                            {course.credits || 3} Credits
                          </span>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {course.name}
                        </h3>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleOpenModal(course)}
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteCourse(course._id)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="p-5 space-y-3">
                    <div className="flex items-center gap-3 text-sm">
                      <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
                        <Building className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                        <span>{course.department}</span>
                      </div>
                      <span className="text-gray-300 dark:text-gray-600">•</span>
                      <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
                        <Calendar className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                        <span>Sem {course.semester}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400">
                      <Users className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                      <span>Max {course.maxStudents || 60} students</span>
                    </div>
                    {course.description && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">{course.description}</p>
                    )}
                    <div className="pt-3 mt-3 border-t border-gray-100 dark:border-gray-700">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500 dark:text-gray-400">Status</span>
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/30 px-2 py-1 rounded-md">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                          Active
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Course Modal */}
      {open && (
        <div className="fixed inset-0 bg-gray-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-md shadow-xl">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                    {editingCourse ? "Edit Course" : "Add New Course"}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {editingCourse ? "Update course details" : "Fill in the course information"}
                  </p>
                </div>
                <button
                  onClick={() => { setOpen(false); resetForm(); }}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Course Name *</label>
                <input className={inputCls} placeholder="e.g., Data Structures & Algorithms" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Course Code *</label>
                <input className={inputCls} placeholder="e.g., CS301" value={code} onChange={(e) => setCode(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Department *</label>
                  <select className={selectCls} value={department} onChange={(e) => setDepartment(e.target.value)}>
                    <option value="">Select Department</option>
                    {departments.map((dept) => <option key={dept} value={dept}>{dept}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Semester *</label>
                  <select className={selectCls} value={semester} onChange={(e) => setSemester(e.target.value)}>
                    <option value="">Select Semester</option>
                    {semesters.map((sem) => <option key={sem} value={sem}>Semester {sem}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Credits</label>
                  <input type="number" className={inputCls} placeholder="e.g., 3" value={credits} onChange={(e) => setCredits(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Max Students</label>
                  <input type="number" className={inputCls} placeholder="e.g., 60" value={maxStudents} onChange={(e) => setMaxStudents(e.target.value)} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                <textarea className={`${inputCls} min-h-[100px]`} placeholder="Enter course description..." value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 dark:border-gray-700">
              <div className="flex justify-end gap-3">
                <button
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                  onClick={() => { setOpen(false); resetForm(); }}
                >
                  Cancel
                </button>
                <button
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed"
                  onClick={addOrUpdateCourse}
                  disabled={!name || !code || !department || !semester}
                >
                  {editingCourse ? "Update Course" : "Add Course"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}