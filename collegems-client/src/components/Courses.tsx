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
  CheckCircle,
  Download,
  Upload,
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

  // update courses by db route is /update/:id

  const updateCourses = async (courseId: string) => {
    try {
      const res = await api.get(`/courses/${courseId}`);
      return res.data;
    } catch (error) {
      console.error("Error fetching course details:", error);
      alert("Failed to load course details");
      return null;
    }
  };

  // /delete/:id
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

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div
          className="bg-linear-to-r from-[#0a295e] to-[#bd2323] p-6 rounded-2xl flex justify-between"
          style={{ borderBottom: `3px solid #e6c235` }}
        >
          <div>
            <h1 className="text-3xl font-bold mb-2">Course Management</h1>
            <p className="text-gray-400">
              Manage and organize all department courses
            </p>
          </div>
          <div>
            <button
              className="mt-4 md:mt-0 px-6 py-2 rounded-lg flex items-center font-medium transition-all hover:scale-105 active:scale-95"
              style={{
                background: "linear-gradient(135deg, #bd2323, #0a295e)",
                border: "1px solid #e6c235",
              }}
              onClick={() => handleOpenModal()}
            >
              <Plus className="w-5 h-5 mr-2" />
              Add New Course
            </button>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-gray-800 rounded-xl p-6 mb-6 border border-gray-700 mt-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-gray-300 text-sm font-medium mb-2">
              <Search className="inline w-4 h-4 mr-2" />
              Search Courses
            </label>
            <input
              type="text"
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#bd2323] focus:ring-2 focus:ring-[#bd2323]/30"
              placeholder="Search by name, code, or department..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-gray-300 text-sm font-medium mb-2">
              <Filter className="inline w-4 h-4 mr-2" />
              Filter by Department
            </label>
            <select
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#0a295e] focus:ring-2 focus:ring-[#0a295e]/30"
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
            <label className="block text-gray-300 text-sm font-medium mb-2">
              <Calendar className="inline w-4 h-4 mr-2" />
              Quick Actions
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => alert("Export feature coming soon")}
                className="flex-1 flex items-center justify-center px-4 py-3 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors border border-gray-600"
              >
                <Download className="w-4 h-4 mr-2" />
                Export
              </button>
              <button
                onClick={() => alert("Import feature coming soon")}
                className="flex-1 flex items-center justify-center px-4 py-3 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors border border-gray-600"
              >
                <Upload className="w-4 h-4 mr-2" />
                Import
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-gray-800 rounded-xl p-6 border-l-4 border-[#bd2323]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Total Courses</p>
              <p className="text-3xl font-bold mt-2">{courses.length}</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-[#bd2323]/20 flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-[#bd2323]" />
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl p-6 border-l-4 border-[#0a295e]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Departments</p>
              <p className="text-3xl font-bold mt-2">
                {new Set(courses.map((c) => c.department)).size}
              </p>
            </div>
            <div className="w-12 h-12 rounded-full bg-[#0a295e]/20 flex items-center justify-center">
              <Building className="w-6 h-6 text-[#0a295e]" />
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl p-6 border-l-4 border-[#e6c235]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Active Semesters</p>
              <p className="text-3xl font-bold mt-2">
                {new Set(courses.map((c) => c.semester)).size}
              </p>
            </div>
            <div className="w-12 h-12 rounded-full bg-[#e6c235]/20 flex items-center justify-center">
              <Calendar className="w-6 h-6 text-[#e6c235]" />
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl p-6 border-l-4 border-[#10b981]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Average Credits</p>
              <p className="text-3xl font-bold mt-2">
                {courses.length > 0
                  ? (
                      courses.reduce((sum, c) => sum + (c.credits || 3), 0) /
                      courses.length
                    ).toFixed(1)
                  : "0"}
              </p>
            </div>
            <div className="w-12 h-12 rounded-full bg-[#10b981]/20 flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-[#10b981]" />
            </div>
          </div>
        </div>
      </div>

      {/* Courses Grid */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">
            All Courses ({filteredCourses.length})
          </h2>
          <span className="text-gray-400">
            Showing {filteredCourses.length} of {courses.length} courses
          </span>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#bd2323]"></div>
            <p className="mt-2 text-gray-400">Loading courses...</p>
          </div>
        ) : filteredCourses.length === 0 ? (
          <div className="text-center py-12 bg-gray-800/50 rounded-xl border border-gray-700">
            <BookOpen className="mx-auto h-12 w-12 text-gray-400 mb-3" />
            <p className="text-gray-400 mb-2">No courses found</p>
            <button
              onClick={() => handleOpenModal()}
              className="text-[#e6c235] hover:text-[#bd2323] transition-colors"
            >
              Add your first course
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCourses.map((course) => (
              <div
                key={course._id}
                className="bg-gray-800 rounded-xl p-6 border border-gray-700 hover:border-[#e6c235] transition-all duration-300 hover:shadow-lg hover:shadow-[#e6c235]/10 group"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold group-hover:text-[#e6c235] transition-colors">
                      {course.name}
                    </h3>
                    <p className="text-gray-400 text-sm">{course.code}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleOpenModal(course)}
                      className="p-2 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
                      title="Edit course"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteCourse(course._id)}
                      className="p-2 bg-red-500/20 rounded-lg hover:bg-red-500/30 transition-colors"
                      title="Delete course"
                    >
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center text-gray-300">
                    <Building className="w-4 h-4 mr-2 text-gray-400" />
                    <span className="text-sm">{course.department}</span>
                  </div>

                  <div className="flex items-center text-gray-300">
                    <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                    <span className="text-sm">Semester {course.semester}</span>
                    <span className="mx-2">•</span>
                    <span className="text-sm">
                      {course.credits || 3} Credits
                    </span>
                  </div>

                  <div className="flex items-center text-gray-300">
                    <Users className="w-4 h-4 mr-2 text-gray-400" />
                    <span className="text-sm">
                      Max {course.maxStudents || 60} Students
                    </span>
                  </div>

                  {course.description && (
                    <p className="text-gray-400 text-sm mt-3 line-clamp-2">
                      {course.description}
                    </p>
                  )}

                  <div className="pt-4 border-t border-gray-700">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Status:</span>
                      <span className="flex items-center text-green-400">
                        <CheckCircle className="w-3 h-3 mr-1" />
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-2xl w-full max-w-md border border-gray-700">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-700">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-semibold">
                  {editingCourse ? "Edit Course" : "Add New Course"}
                </h3>
                <button
                  onClick={() => {
                    setOpen(false);
                    resetForm();
                  }}
                  className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-gray-400 text-sm mt-1">
                {editingCourse
                  ? "Update course details"
                  : "Fill in the course information"}
              </p>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  Course Name *
                </label>
                <input
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#bd2323] focus:ring-2 focus:ring-[#bd2323]/30"
                  placeholder="e.g., Data Structures & Algorithms"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  Course Code *
                </label>
                <input
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#0a295e] focus:ring-2 focus:ring-[#0a295e]/30"
                  placeholder="e.g., CS301"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">
                    Department *
                  </label>
                  <select
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#e6c235] focus:ring-2 focus:ring-[#e6c235]/30"
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
                  <label className="block text-gray-300 text-sm font-medium mb-2">
                    Semester *
                  </label>
                  <select
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#e6c235] focus:ring-2 focus:ring-[#e6c235]/30"
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
                  <label className="block text-gray-300 text-sm font-medium mb-2">
                    Credits
                  </label>
                  <input
                    type="number"
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#0a295e] focus:ring-2 focus:ring-[#0a295e]/30"
                    placeholder="e.g., 3"
                    value={credits}
                    onChange={(e) => setCredits(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">
                    Max Students
                  </label>
                  <input
                    type="number"
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#0a295e] focus:ring-2 focus:ring-[#0a295e]/30"
                    placeholder="e.g., 60"
                    value={maxStudents}
                    onChange={(e) => setMaxStudents(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  Description
                </label>
                <textarea
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#bd2323] focus:ring-2 focus:ring-[#bd2323]/30 min-h-25"
                  placeholder="Enter course description..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-gray-700">
              <div className="flex justify-end gap-3">
                <button
                  className="px-6 py-3 bg-gray-700 text-white font-medium rounded-lg hover:bg-gray-600 transition-colors"
                  onClick={() => {
                    setOpen(false);
                    resetForm();
                  }}
                >
                  Cancel
                </button>
                <button
                  className="px-6 py-3 bg-linear-to-r from-[#0a295e] to-[#bd2323] text-white font-semibold rounded-lg hover:shadow-lg hover:shadow-[#bd2323]/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={() => {
                    addOrUpdateCourse();
                    updateCourses(editingCourse?._id || "");
                  }}
                  disabled={!name || !code || !department || !semester}
                >
                  {editingCourse ? "Update Course" : "Add Course"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Empty State Instructions */}
      {courses.length === 0 && !loading && (
        <div className="bg-gray-800/50 rounded-xl p-8 border border-dashed border-gray-700 text-center">
          <BookOpen className="mx-auto h-16 w-16 text-gray-400 mb-4" />
          <h3 className="text-xl font-semibold mb-2">No courses added yet</h3>
          <p className="text-gray-400 mb-6 max-w-md mx-auto">
            Start by adding courses to your department. Courses help organize
            curriculum and manage student enrollments.
          </p>
          <button
            onClick={() => handleOpenModal()}
            className="px-6 py-3 bg-linear-to-r from-[#0a295e] to-[#bd2323] text-white font-semibold rounded-lg hover:shadow-lg hover:shadow-[#bd2323]/20 transition-all"
          >
            <Plus className="inline w-5 h-5 mr-2" />
            Add Your First Course
          </button>
        </div>
      )}
    </div>
  );
}
