import { useEffect, useState } from "react";
import api from "../api/axios";
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
} from "lucide-react";

// interfaces
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

export default function HodCourses() {
  const [open, setOpen] = useState(false);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // Form states
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [department, setDepartment] = useState("");
  const [semester, setSemester] = useState("");
  const [credits, setCredits] = useState("");
  const [description, setDescription] = useState("");
  const [maxStudents, setMaxStudents] = useState("");

  // Departments and semesters
  const departments = [
    "Computer Science",
    "Electrical",
    "Mechanical",
    "Civil",
    "Electronics",
    "Mathematics",
    "Physics",
    "Chemistry",
  ];
  const semesters = [1, 2, 3, 4, 5, 6, 7, 8];

  const fetchCourses = async () => {
    try {
      setLoading(true);
      const res = await api.get("/courses/all");
      setCourses(res.data);
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

  useEffect(() => {
    fetchCourses();
  }, []);

  const resetForm = () => {
    setName("");
    setCode("");
    setDepartment("");
    setSemester("");
    setCredits("");
    setDescription("");
    setMaxStudents("");
    setEditingCourse(null);
  };

  const handleOpenModal = (course: Course | null = null) => {
    if (course) {
      setEditingCourse(course);
      setName(course.name);
      setCode(course.code);
      setDepartment(course.department);
      setSemester(course.semester.toString());
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
        name,
        code,
        department,
        semester: Number(semester),
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
      const searchLower = search.toLowerCase();
      return (
        course.name.toLowerCase().includes(searchLower) ||
        course.code.toLowerCase().includes(searchLower) ||
        course.department.toLowerCase().includes(searchLower)
      );
    }

    return true;
  });

  const stats = {
    totalCourses: courses.length,
    totalDepartments: new Set(courses.map((c) => c.department)).size,
    totalSemesters: new Set(courses.map((c) => c.semester)).size,
    avgCredits:
      courses.length > 0
        ? (
            courses.reduce((sum, c) => sum + (c.credits || 3), 0) /
            courses.length
          ).toFixed(1)
        : "0",
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-50 rounded-lg">
              <BookOpen className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Courses</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.totalCourses}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-50 rounded-lg">
              <Building className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Departments</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.totalDepartments}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-50 rounded-lg">
              <Calendar className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Active Semesters</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.totalSemesters}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-50 rounded-lg">
              <Award className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Avg. Credits</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.avgCredits}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              size={18}
            />
            <input
              type="text"
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Search by name, code, or department..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Filter className="w-4 h-4" />
            Filters
            <ChevronDown
              className={`w-4 h-4 transition-transform ${showFilters ? "rotate-180" : ""}`}
            />
          </button>
          <div className="flex items-center gap-3">
            <button
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              onClick={() => handleOpenModal()}
            >
              <Plus className="w-4 h-4" />
              Add Course
            </button>
          </div>
        </div>

        {/* Expanded Filters */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Department
                </label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                >
                  <option value="all">All Departments</option>
                  {departments.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Semester
                </label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="all">All Semesters</option>
                  {semesters.map((sem) => (
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

      {/* Courses Grid */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-900">All Courses</h2>
          <span className="text-sm text-gray-500">
            Showing {filteredCourses.length} of {courses.length} courses
          </span>
        </div>

        {loading ? (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent"></div>
            <p className="mt-2 text-gray-500">Loading courses...</p>
          </div>
        ) : filteredCourses.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
            <BookOpen className="mx-auto h-12 w-12 text-gray-300 mb-3" />
            <p className="text-gray-600 mb-2">No courses found</p>
            <p className="text-sm text-gray-500 mb-4">
              Try adjusting your search or filters
            </p>
            <button
              onClick={() => handleOpenModal()}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add your first course
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCourses.map((course) => (
              <div
                key={course._id}
                className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-all group"
              >
                {/* Card Header */}
                <div className="p-5 border-b border-gray-100">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="px-2 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-md">
                          {course.code}
                        </span>
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-md ${
                            course.credits && course.credits > 4
                              ? "bg-amber-50 text-amber-700"
                              : "bg-gray-50 text-gray-700"
                          }`}
                        >
                          {course.credits || 3} Credits
                        </span>
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                        {course.name}
                      </h3>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleOpenModal(course)}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edit course"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deleteCourse(course._id)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete course"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-5 space-y-3">
                  <div className="flex items-center gap-3 text-sm">
                    <div className="flex items-center gap-1.5 text-gray-600">
                      <Building className="w-4 h-4 text-gray-400" />
                      <span>{course.department}</span>
                    </div>
                    <span className="text-gray-300">•</span>
                    <div className="flex items-center gap-1.5 text-gray-600">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span>Sem {course.semester}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 text-sm text-gray-600">
                    <Users className="w-4 h-4 text-gray-400" />
                    <span>Max {course.maxStudents || 60} students</span>
                  </div>

                  {course.description && (
                    <p className="text-sm text-gray-500 line-clamp-2">
                      {course.description}
                    </p>
                  )}

                  {/* Status Badge */}
                  <div className="pt-3 mt-3 border-t border-gray-100">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">Status</span>
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-green-700 bg-green-50 px-2 py-1 rounded-md">
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

      {/* Add/Edit Course Modal */}
      {open && (
        <div className="fixed inset-0 bg-gray-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl w-full max-w-md shadow-xl">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">
                    {editingCourse ? "Edit Course" : "Add New Course"}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {editingCourse
                      ? "Update course details"
                      : "Fill in the course information"}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setOpen(false);
                    resetForm();
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Course Name *
                </label>
                <input
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Data Structures & Algorithms"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Course Code *
                </label>
                <input
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., CS301"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Department *
                  </label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                  >
                    <option value="">Select Department</option>
                    {departments.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Semester *
                  </label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={semester}
                    onChange={(e) => setSemester(e.target.value)}
                  >
                    <option value="">Select Semester</option>
                    {semesters.map((sem) => (
                      <option key={sem} value={sem}>
                        Semester {sem}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Credits
                  </label>
                  <input
                    type="number"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., 3"
                    value={credits}
                    onChange={(e) => setCredits(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Max Students
                  </label>
                  <input
                    type="number"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., 60"
                    value={maxStudents}
                    onChange={(e) => setMaxStudents(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-25"
                  placeholder="Enter course description..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-gray-200">
              <div className="flex justify-end gap-3">
                <button
                  className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  onClick={() => {
                    setOpen(false);
                    resetForm();
                  }}
                >
                  Cancel
                </button>
                <button
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
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

      {/* Empty State */}
      {courses.length === 0 && !loading && (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-blue-50 rounded-full flex items-center justify-center">
            <BookOpen className="w-8 h-8 text-blue-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No courses added yet
          </h3>
          <p className="text-gray-500 mb-6 max-w-md mx-auto">
            Start by adding courses to your department. Courses help organize
            curriculum and manage student enrollments.
          </p>
          <button
            onClick={() => handleOpenModal()}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Your First Course
          </button>
        </div>
      )}
    </div>
  );
}
