import React, { useState, useEffect } from "react";
import {
  BookOpen,
  Plus,
  Edit,
  Trash2,
  X,
  Save,
  RefreshCw,
  User,
  Clock,
  Search,
  Filter,
  ChevronDown,
  Users,
  GraduationCap,
  LayoutGrid,
} from "lucide-react";
import api from "../api/axios";

interface Course {
  _id: string;
  name: string;
}

interface Teacher {
  _id: string;
  name: string;
  email: string;
}

interface ClassType {
  _id?: string;
  name: string;
  semester: number;
  schedule: string;
  teacher: string | Teacher;
  courseName: string | Course;
}

const Classes: React.FC = () => {
  const [classes, setClasses] = useState<ClassType[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassType | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterSemester, setFilterSemester] = useState<number | "all">("all");
  const [filterCourse, setFilterCourse] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);
  const [formData, setFormData] = useState<ClassType>({
    name: "",
    semester: 1,
    schedule: "",
    teacher: "",
    courseName: "",
  });

  // Fetch all courses
  const fetchCourses = async () => {
    try {
      const res = await api.get("/courses/all");
      setCourses(res.data);
    } catch (error) {
      console.error("Error fetching courses:", error);
    }
  };

  // Fetch all classes
  const fetchClasses = async () => {
    try {
      setLoading(true);
      const response = await api.get("/classes/all");
      setClasses(response.data);
    } catch (error) {
      console.error("Error fetching classes:", error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch teachers
  const fetchTeachers = async () => {
    try {
      const response = await api.get("/users/teachers");
      setTeachers(response.data);
    } catch (error) {
      console.error("Error fetching teachers:", error);
    }
  };

  useEffect(() => {
    Promise.all([fetchCourses(), fetchClasses(), fetchTeachers()]);
  }, []);

  // Handle form input changes
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "semester" ? parseInt(value) : value,
    }));
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      courseName: "",
      name: "",
      semester: 1,
      schedule: "",
      teacher: "",
    });
    setEditingClass(null);
    setShowForm(false);
  };

  // Open edit form
  const handleEdit = (classItem: ClassType) => {
    setEditingClass(classItem);
    setFormData({
      courseName:
        typeof classItem.courseName === "object"
          ? classItem.courseName._id
          : classItem.courseName,
      name: classItem.name,
      semester: classItem.semester,
      schedule: classItem.schedule,
      teacher:
        typeof classItem.teacher === "object"
          ? classItem.teacher._id
          : classItem.teacher,
    });
    setShowForm(true);
  };

  // Add new class
  const handleAddClass = async () => {
    if (
      !formData.courseName ||
      !formData.name ||
      !formData.semester ||
      !formData.schedule ||
      !formData.teacher
    ) {
      alert("Please fill in all fields");
      return;
    }

    try {
      setLoading(true);
      await api.post("/classes/add", formData);
      resetForm();
      fetchClasses();
    } catch (error) {
      console.error("Error adding class:", error);
      alert("Failed to add class");
    } finally {
      setLoading(false);
    }
  };

  // Update class
  const handleUpdateClass = async () => {
    if (!editingClass?._id) return;

    try {
      setLoading(true);
      await api.put(`/classes/update/${editingClass._id}`, formData);
      resetForm();
      fetchClasses();
    } catch (error) {
      console.error("Error updating class:", error);
      alert("Failed to update class");
    } finally {
      setLoading(false);
    }
  };

  // Delete class
  const handleDeleteClass = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this class?")) return;

    try {
      setLoading(true);
      await api.delete(`/classes/delete/${id}`);
      fetchClasses();
    } catch (error) {
      console.error("Error deleting class:", error);
      alert("Failed to delete class");
    } finally {
      setLoading(false);
    }
  };

  // Filter classes
  const filteredClasses = classes.filter((cls) => {
    const matchesSearch = cls.name
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesSemester =
      filterSemester === "all" || cls.semester === filterSemester;
    const courseId =
      typeof cls.courseName === "object" ? cls.courseName._id : cls.courseName;
    const matchesCourse = filterCourse === "all" || courseId === filterCourse;
    return matchesSearch && matchesSemester && matchesCourse;
  });

  const getCourseName = (courseID: string) => {
    const course = courses.find((c) => c._id === courseID);
    return course ? course.name : "Undefined Course";
  };

  const getTeacherName = (teacherId: string) => {
    const teacher = teachers.find((t) => t._id === teacherId);
    return teacher ? teacher.name : "Unknown Teacher";
  };

  const stats = {
    total: classes.length,
    lowerSemester: classes.filter((c) => c.semester <= 4).length,
    upperSemester: classes.filter((c) => c.semester > 4).length,
    teachers: teachers.length,
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Class Management
            </h1>
            <p className="text-gray-500 mt-1">
              Manage all your classes, schedules, and teacher assignments
            </p>
          </div>
          <button
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add New Class
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-50 rounded-lg">
              <BookOpen className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Classes</p>
              <p className="text-xl font-bold text-gray-900">{stats.total}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-50 rounded-lg">
              <GraduationCap className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Lower Semester</p>
              <p className="text-xl font-bold text-gray-900">
                {stats.lowerSemester}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-50 rounded-lg">
              <GraduationCap className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Upper Semester</p>
              <p className="text-xl font-bold text-gray-900">
                {stats.upperSemester}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-50 rounded-lg">
              <Users className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Available Teachers</p>
              <p className="text-xl font-bold text-gray-900">
                {stats.teachers}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters Section */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              size={18}
            />
            <input
              type="text"
              placeholder="Search classes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
        </div>

        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Semester
                </label>
                <select
                  value={filterSemester}
                  onChange={(e) =>
                    setFilterSemester(
                      e.target.value === "all"
                        ? "all"
                        : parseInt(e.target.value),
                    )
                  }
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
                  Course
                </label>
                <select
                  value={filterCourse}
                  onChange={(e) => setFilterCourse(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Courses</option>
                  {courses.map((course) => (
                    <option key={course._id} value={course._id}>
                      {course.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Classes Grid */}
      {loading ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent"></div>
          <p className="mt-4 text-gray-500">Loading classes...</p>
        </div>
      ) : filteredClasses.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <LayoutGrid className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No classes found
          </h3>
          <p className="text-gray-500 mb-4">
            {classes.length === 0
              ? "Add your first class to get started"
              : "Try adjusting your search or filters"}
          </p>
          {classes.length === 0 && (
            <button
              onClick={() => {
                resetForm();
                setShowForm(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add First Class
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredClasses.map((cls) => (
            <div
              key={cls._id}
              className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow"
            >
              {/* Card Header */}
              <div className="p-5 border-b border-gray-100">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {typeof cls.courseName === "object"
                        ? cls.courseName.name
                        : getCourseName(cls.courseName)}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">{cls.name}</p>
                  </div>
                  <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700">
                    Sem {cls.semester}
                  </span>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-5 space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <div className="p-2 bg-gray-50 rounded-lg">
                    <User className="w-4 h-4 text-gray-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Teacher</p>
                    <p className="font-medium text-gray-900">
                      {typeof cls.teacher === "object"
                        ? cls.teacher.name
                        : getTeacherName(cls.teacher)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <div className="p-2 bg-gray-50 rounded-lg">
                    <Clock className="w-4 h-4 text-gray-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Schedule</p>
                    <p className="font-medium text-gray-900">{cls.schedule}</p>
                  </div>
                </div>
              </div>

              {/* Card Footer */}
              <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex justify-end gap-2">
                <button
                  onClick={() => handleEdit(cls)}
                  className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  title="Edit Class"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => cls._id && handleDeleteClass(cls._id)}
                  className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Delete Class"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Class Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                {editingClass ? (
                  <>
                    <Edit className="w-5 h-5 text-blue-600" />
                    Edit Class
                  </>
                ) : (
                  <>
                    <Plus className="w-5 h-5 text-blue-600" />
                    Add New Class
                  </>
                )}
              </h2>
              <button
                onClick={resetForm}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              {/* Course Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Course *
                </label>
                <select
                  name="courseName"
                  value={
                    typeof formData.courseName === "object"
                      ? formData.courseName._id
                      : formData.courseName
                  }
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select a course</option>
                  {courses.map((course) => (
                    <option key={course._id} value={course._id}>
                      {course.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Class Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Class Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="e.g., Computer Science 101"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Semester and Schedule */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Semester *
                  </label>
                  <select
                    name="semester"
                    value={formData.semester}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
                      <option key={sem} value={sem}>
                        Semester {sem}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Schedule *
                  </label>
                  <input
                    type="text"
                    name="schedule"
                    value={formData.schedule}
                    onChange={handleInputChange}
                    placeholder="e.g., Mon/Wed 10:00 AM"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Teacher Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Assign Teacher *
                </label>
                <select
                  name="teacher"
                  value={
                    typeof formData.teacher === "object"
                      ? formData.teacher._id
                      : formData.teacher
                  }
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select a teacher</option>
                  {teachers.map((teacher) => (
                    <option key={teacher._id} value={teacher._id}>
                      {teacher.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={resetForm}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={editingClass ? handleUpdateClass : handleAddClass}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    {editingClass ? "Update Class" : "Save Class"}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Classes;
