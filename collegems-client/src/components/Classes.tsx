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
  Hash,
  Clock,
  Search,
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
  const [formData, setFormData] = useState<ClassType>({
    name: "",
    semester: 1,
    schedule: "",
    teacher: "",
    courseName: "",
  });

  //  fetch all courses
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

  // Fetch all classes
  const fetchClasses = async () => {
    try {
      setLoading(true);
      const response = await api.get("/classes/all");
      // Assuming the response includes teacher details
      setClasses(response.data);
    } catch (error) {
      console.error("Error fetching classes:", error);
      alert("Failed to load classes data");
    } finally {
      setLoading(false);
    }
  };

  // Fetch teachers
  const fetchTeachers = async () => {
    try {
      setLoading(true);
      const response = await api.get("/users/teachers");
      setTeachers(response.data);
    } catch (error) {
      console.error("Error fetching teachers:", error);
      alert("Failed to load teachers data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
    fetchClasses();
    fetchTeachers();
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
      courseName: classItem.courseName,
      name: classItem.name,
      semester: classItem.semester,
      schedule: classItem.schedule,
      teacher: classItem.teacher,
    });
    setShowForm(true);
  };

  // Add new class
  const handleAddClass = async () => {
    // Validation
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
      alert("Class added successfully!");
      resetForm();
      fetchClasses(); // Refresh the list
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
      alert("Class updated successfully!");
      resetForm();
      fetchClasses(); // Refresh the list
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
      alert("Class deleted successfully!");
      fetchClasses(); // Refresh the list
    } catch (error) {
      console.error("Error deleting class:", error);
      alert("Failed to delete class");
    } finally {
      setLoading(false);
    }
  };

  // Filter classes based on search and semester
  const filteredClasses = classes.filter((cls) => {
    const matchesSearch = cls.name
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesSemester =
      filterSemester === "all" || cls.semester === filterSemester;
    return matchesSearch && matchesSemester;
  });

  // get course byid
  const getCourseName = (courseID: string) => {
    const course = courses.find((c) => c._id === courseID);
    return course ? course.name : "Undefined Course";
  };

  // Get teacher name by ID
  const getTeacherName = (teacherId: string) => {
    const teacher = teachers.find((t) => t._id === teacherId);
    return teacher ? teacher.name : "Unknown Teacher";
  };

  return (
    <div className="min-h-screen bg-gray-900 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <div
          className="bg-linear-to-r from-[#0a295e] to-[#bd2323] p-6 rounded-2xl flex justify-between"
          style={{ borderBottom: `3px solid #e6c235` }}
        >
          <div>
            <h1 className="text-2xl md:text-3xl font-bold flex items-center">
              <BookOpen
                className="mr-3"
                style={{ color: "#e6c235" }}
                size={28}
              />
              <span>Class Management</span>
            </h1>
            <p className="text-gray-400 mt-1">
              Manage all your classes, schedules, and teacher assignments
            </p>
          </div>

          {/* Add Class Button */}
          <div>
            <button
              onClick={() => {
                resetForm();
                setShowForm(true);
              }}
              className="mt-4 md:mt-0 px-6 py-2 rounded-lg flex items-center font-medium transition-all hover:scale-105 active:scale-95"
              style={{
                background: "linear-gradient(135deg, #bd2323, #0a295e)",
                border: "1px solid #e6c235",
              }}
            >
              <Plus size={20} className="mr-2" />
              Add New Class
            </button>
          </div>
        </div>

        {/* Add/Edit Class Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl border border-gray-700 ">
              {/* Form Header */}
              <div
                className="px-6 py-4 rounded-t-2xl flex justify-between items-center"
                style={{
                  background: "linear-gradient(90deg, #0a295e, #bd2323)",
                  borderBottom: `2px solid #e6c235`,
                }}
              >
                <h2 className="text-xl font-bold text-white flex items-center">
                  {editingClass ? (
                    <>
                      <Edit size={20} className="mr-2" />
                      Edit Class
                    </>
                  ) : (
                    <>
                      <Plus size={20} className="mr-2" />
                      Add New Class
                    </>
                  )}
                </h2>
                <button
                  onClick={resetForm}
                  className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
                >
                  <X size={20} className="text-white" />
                </button>
              </div>

              {/* Form Body */}
              <div className="p-6 space-y-4">
                {/* Course name  */}
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">
                    <User
                      size={16}
                      className="inline mr-1"
                      style={{ color: "#e6c235" }}
                    />
                    Assign Courses *
                  </label>
                  <select
                    name="courseName"
                    value={formData.courseName}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-[#bd2323] focus:ring-1 focus:ring-[#bd2323] transition-colors"
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
                  <label className="block text-gray-300 text-sm font-medium mb-2">
                    <BookOpen
                      size={16}
                      className="inline mr-1"
                      style={{ color: "#e6c235" }}
                    />
                    Class Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="e.g., Computer Science 101"
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-[#bd2323] focus:ring-1 focus:ring-[#bd2323] transition-colors"
                  />
                </div>

                {/* Semester and Schedule Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-300 text-sm font-medium mb-2">
                      <Hash
                        size={16}
                        className="inline mr-1"
                        style={{ color: "#e6c235" }}
                      />
                      Semester *
                    </label>
                    <select
                      name="semester"
                      value={formData.semester}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-[#bd2323] focus:ring-1 focus:ring-[#bd2323] transition-colors"
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
                        <option key={sem} value={sem}>
                          Semester {sem}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-gray-300 text-sm font-medium mb-2">
                      <Clock
                        size={16}
                        className="inline mr-1"
                        style={{ color: "#e6c235" }}
                      />
                      Schedule *
                    </label>
                    <input
                      type="text"
                      name="schedule"
                      value={formData.schedule}
                      onChange={handleInputChange}
                      placeholder="e.g., Mon/Wed 10:00 AM"
                      className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-[#bd2323] focus:ring-1 focus:ring-[#bd2323] transition-colors"
                    />
                  </div>
                </div>

                {/* Teacher Selection */}
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">
                    <User
                      size={16}
                      className="inline mr-1"
                      style={{ color: "#e6c235" }}
                    />
                    Assign Teacher *
                  </label>
                  <select
                    name="teacher"
                    value={formData.teacher}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-[#bd2323] focus:ring-1 focus:ring-[#bd2323] transition-colors"
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

              {/* Form Footer */}
              <div className="px-6 py-4 bg-gray-750 rounded-b-2xl flex justify-end space-x-3 border-t border-gray-700">
                <button
                  onClick={resetForm}
                  className="px-6 py-2 rounded-lg font-medium hover:bg-gray-700 transition-colors"
                  style={{ border: "1px solid #666" }}
                >
                  Cancel
                </button>
                <button
                  onClick={editingClass ? handleUpdateClass : handleAddClass}
                  className="px-6 py-2 rounded-lg font-medium flex items-center transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
                  style={{
                    background: "linear-gradient(135deg, #bd2323, #0a295e)",
                    border: "1px solid #e6c235",
                  }}
                >
                  {loading ? (
                    <>
                      <RefreshCw size={18} className="mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Save size={18} className="mr-2" />
                      {editingClass ? "Update Class" : "Save Class"}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Filters and Search */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 mt-10">
          <div className="flex flex-wrap gap-3">
            {/* Semester Filter */}
            <select
              value={filterSemester}
              onChange={(e) =>
                setFilterSemester(
                  e.target.value === "all" ? "all" : parseInt(e.target.value),
                )
              }
              className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-[#bd2323]"
            >
              <option value="all">All Semesters</option>
              {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
                <option key={sem} value={sem}>
                  Semester {sem}
                </option>
              ))}
            </select>

            {/* Teacher Count Badge */}
            <div
              className="px-4 py-2 rounded-lg flex items-center"
              style={{
                backgroundColor: "rgba(10, 41, 94, 0.3)",
                border: "1px solid #0a295e",
              }}
            >
              <User size={18} className="mr-2" style={{ color: "#e6c235" }} />
              <span>{teachers.length} Teachers</span>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative w-full md:w-64">
            <Search
              size={18}
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              placeholder="Search classes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-[#bd2323] focus:ring-1 focus:ring-[#bd2323]"
            />
          </div>
        </div>

        {/* Classes Grid */}
        {loading && !showForm ? (
          <div className="flex justify-center items-center h-64">
            <div
              className="animate-spin rounded-full h-12 w-12 border-4 border-t-transparent"
              style={{ borderColor: "#e6c235", borderTopColor: "transparent" }}
            ></div>
          </div>
        ) : (
          <>
            {/* Stats Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div
                className="bg-gray-800 rounded-xl p-4 border-l-4"
                style={{ borderLeftColor: "#bd2323" }}
              >
                <div className="text-2xl font-bold">{classes.length}</div>
                <div className="text-gray-400 text-sm">Total Classes</div>
              </div>
              <div
                className="bg-gray-800 rounded-xl p-4 border-l-4"
                style={{ borderLeftColor: "#0a295e" }}
              >
                <div className="text-2xl font-bold">
                  {classes.filter((c) => c.semester <= 4).length}
                </div>
                <div className="text-gray-400 text-sm">Lower Semester</div>
              </div>
              <div
                className="bg-gray-800 rounded-xl p-4 border-l-4"
                style={{ borderLeftColor: "#e6c235" }}
              >
                <div className="text-2xl font-bold">
                  {classes.filter((c) => c.semester > 4).length}
                </div>
                <div className="text-gray-400 text-sm">Upper Semester</div>
              </div>
              <div
                className="bg-gray-800 rounded-xl p-4 border-l-4"
                style={{ borderLeftColor: "#000000" }}
              >
                <div className="text-2xl font-bold">{teachers.length}</div>
                <div className="text-gray-400 text-sm">Available Teachers</div>
              </div>
            </div>

            {/* Classes Cards Grid */}
            {filteredClasses.length === 0 ? (
              <div className="text-center py-12">
                <BookOpen size={48} className="mx-auto mb-4 text-gray-600" />
                <h3 className="text-xl font-medium text-gray-400 mb-2">
                  No classes found
                </h3>
                <p className="text-gray-500">
                  Add your first class to get started
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredClasses.map((cls) => (
                  <div
                    key={cls._id}
                    className="bg-gray-800 rounded-xl border-l-4 overflow-hidden hover:shadow-xl transition-all hover:scale-[1.02]"
                    style={{ borderLeftColor: "#bd2323" }}
                  >
                    <div className="p-5">
                      {/* Header */}
                      <div className="flex justify-between items-start mb-3">
                        <h2 className="font-bold text-lg text-white">
                          {typeof cls.courseName === "object"
                            ? cls.courseName.name
                            : getCourseName(cls.courseName)}
                        </h2>
                        <h3 className="font-bold text-lg text-white">
                          {cls.name}
                        </h3>
                        <span
                          className="px-3 py-1 rounded-full text-xs font-medium"
                          style={{
                            backgroundColor: "rgba(230, 194, 53, 0.2)",
                            color: "#e6c235",
                            border: "1px solid #e6c235",
                          }}
                        >
                          Sem {cls.semester}
                        </span>
                      </div>

                      {/* Details */}
                      <div className="space-y-2 mb-4">
                        <div className="flex items-center text-sm">
                          <User
                            size={16}
                            className="mr-2"
                            style={{ color: "#0a295e" }}
                          />
                          <span className="text-gray-300">
                            {typeof cls.teacher === "object"
                              ? cls.teacher.name
                              : getTeacherName(cls.teacher)}
                          </span>
                        </div>
                        <div className="flex items-center text-sm">
                          <Clock
                            size={16}
                            className="mr-2"
                            style={{ color: "#bd2323" }}
                          />
                          <span className="text-gray-300">{cls.schedule}</span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex justify-end space-x-2 pt-3 border-t border-gray-700">
                        <button
                          onClick={() => handleEdit(cls)}
                          className="p-2 rounded-lg hover:bg-gray-700 transition-colors"
                          title="Edit Class"
                        >
                          <Edit size={18} style={{ color: "#e6c235" }} />
                        </button>
                        <button
                          onClick={() => cls._id && handleDeleteClass(cls._id)}
                          className="p-2 rounded-lg hover:bg-gray-700 transition-colors"
                          title="Delete Class"
                        >
                          <Trash2 size={18} style={{ color: "#bd2323" }} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Classes;
