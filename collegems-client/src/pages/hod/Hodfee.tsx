import { useEffect, useState } from "react";
import {
  Users,
  DollarSign,
  Calendar,
  BookOpen,
  CheckCircle,
  XCircle,
  Search,
  GraduationCap,
  Filter,
  ChevronDown,
  Clock,
  Wallet,
} from "lucide-react";
import api from "../../api/axios";

interface Student {
  _id: string;
  name: string;
  email?: string;
  course?: string;
  semester?: number;
}

export default function Hodfee() {
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [total, setTotal] = useState<number | "">("");
  const [dueDate, setDueDate] = useState<string>("");
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCourse, setFilterCourse] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);

  const [enableCourseWise, setEnableCourseWise] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<string>("");
  const [courseFee, setCourseFee] = useState<number | "">("");

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const response = await api.get("/users/students");
      setStudents(response.data);
      setMessage(null);
    } catch (error) {
      console.error("Error fetching students:", error);
      setMessage({
        type: "error",
        text: "Failed to load students data. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const filteredStudents = students.filter((student) => {
    const matchesSearch =
      student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (student.email?.toLowerCase() || "").includes(searchTerm.toLowerCase());
    const matchesCourse =
      filterCourse === "all" || student.course === filterCourse;
    return matchesSearch && matchesCourse;
  });

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents(filteredStudents.map((s) => s._id));
    }
    setSelectAll(!selectAll);
  };

  const handleSelectStudent = (studentId: string) => {
    setSelectedStudents((prev) => {
      if (prev.includes(studentId)) {
        return prev.filter((id) => id !== studentId);
      } else {
        return [...prev, studentId];
      }
    });
    setSelectAll(false);
  };

  const handleBulkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedStudents.length === 0) {
      setMessage({
        type: "error",
        text: "Please select at least one student",
      });
      return;
    }

    if (!total || !dueDate) {
      setMessage({
        type: "error",
        text: "Total fee and due date are required",
      });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const promises = selectedStudents.map((studentId) =>
        api.post("/fee/set", {
          student: studentId,
          total: Number(total),
          dueDate,
        }),
      );

      await Promise.all(promises);

      setMessage({
        type: "success",
        text: `Fee set successfully for ${selectedStudents.length} student(s)!`,
      });

      setSelectedStudents([]);
      setSelectAll(false);
      setTotal("");
      setDueDate("");
    } catch (err: any) {
      setMessage({
        type: "error",
        text:
          err.response?.data?.message || "Error setting fee for some students",
      });
    } finally {
      setLoading(false);
    }
  };

  const stats = {
    totalStudents: students.length,
    selectedCount: selectedStudents.length,
    totalAmount: total ? Number(total) * selectedStudents.length : 0,
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-50 rounded-lg">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Students</p>
              <p className="text-xl font-bold text-gray-900">
                {students.length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-50 rounded-lg">
              <Users className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Selected Students</p>
              <p className="text-xl font-bold text-gray-900">
                {selectedStudents.length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-50 rounded-lg">
              <Wallet className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Amount</p>
              <p className="text-xl font-bold text-gray-900">
                ₹{stats.totalAmount.toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Toggle Buttons */}
      <div className="bg-white rounded-xl border border-gray-200 p-1 inline-flex">
        <button
          onClick={() => setEnableCourseWise(false)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            !enableCourseWise
              ? "bg-blue-600 text-white"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          <Users className="inline w-4 h-4 mr-2" />
          Bulk Selection
        </button>
        <button
          onClick={() => setEnableCourseWise(true)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            enableCourseWise
              ? "bg-blue-600 text-white"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          <BookOpen className="inline w-4 h-4 mr-2" />
          Course-wise
        </button>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Student Selection Panel */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {/* Search and Filter Bar */}
            <div className="p-4 border-b border-gray-200">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 relative">
                  <Search
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                    size={18}
                  />
                  <input
                    type="text"
                    placeholder="Search students by name or email..."
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
                        <option value="bca">BCA</option>
                        <option value="bba">BBA</option>
                        <option value="mba">MBA</option>
                        <option value="bcom">B.Com</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Semester
                      </label>
                      <select className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="all">All Semesters</option>
                        <option value="1">Semester 1</option>
                        <option value="2">Semester 2</option>
                        <option value="3">Semester 3</option>
                        <option value="4">Semester 4</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Student List Header */}
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center">
              <div className="flex items-center w-8 mr-4">
                <input
                  type="checkbox"
                  checked={selectAll}
                  onChange={handleSelectAll}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              </div>
              <div className="flex-1 font-medium text-gray-700">Student</div>
              <div className="w-24 font-medium text-gray-700">Course</div>
              <div className="w-24 font-medium text-gray-700">Status</div>
            </div>

            {/* Student List */}
            <div className="max-h-96 overflow-y-auto">
              {loading ? (
                <div className="p-12 text-center">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent"></div>
                  <p className="mt-4 text-gray-500">Loading students...</p>
                </div>
              ) : filteredStudents.length === 0 ? (
                <div className="p-12 text-center">
                  <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No students found</p>
                  <p className="text-sm text-gray-400 mt-1">
                    Try adjusting your search or filters
                  </p>
                </div>
              ) : (
                filteredStudents.map((student) => (
                  <div
                    key={student._id}
                    className={`px-4 py-3 border-b border-gray-100 flex items-center hover:bg-gray-50 transition-colors ${
                      selectedStudents.includes(student._id) ? "bg-blue-50" : ""
                    }`}
                  >
                    <div className="flex items-center w-8 mr-4">
                      <input
                        type="checkbox"
                        checked={selectedStudents.includes(student._id)}
                        onChange={() => handleSelectStudent(student._id)}
                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">
                        {student.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {student.email || "No email"}
                      </div>
                    </div>
                    <div className="w-24">
                      <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-700">
                        {student.course?.toUpperCase() || "N/A"}
                      </span>
                    </div>
                    <div className="w-24">
                      <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-green-50 text-green-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1.5"></span>
                        Active
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Selection Summary */}
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">
                  <span className="font-medium text-gray-900">
                    {selectedStudents.length}
                  </span>{" "}
                  students selected
                </span>
                {selectedStudents.length > 0 && (
                  <button
                    onClick={() => setSelectedStudents([])}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Clear selection
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Fee Setting Form */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl border border-gray-200 p-6 sticky top-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">
              {!enableCourseWise ? "Set Fee Details" : "Course-wise Fee Setup"}
            </h2>

            {!enableCourseWise ? (
              <form onSubmit={handleBulkSubmit} className="space-y-5">
                {/* Total Fee */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fee Amount *
                  </label>
                  <div className="relative">
                    <DollarSign
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                      size={18}
                    />
                    <input
                      type="number"
                      placeholder="Enter amount"
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={total}
                      onChange={(e) => setTotal(Number(e.target.value))}
                      min="0"
                    />
                  </div>
                </div>

                {/* Due Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Due Date *
                  </label>
                  <div className="relative">
                    <Calendar
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                      size={18}
                    />
                    <input
                      type="date"
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                    />
                  </div>
                </div>

                {/* Summary Card */}
                {selectedStudents.length > 0 && total && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <h3 className="text-sm font-medium text-gray-700 mb-3">
                      Summary
                    </h3>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Students:</span>
                        <span className="font-medium text-gray-900">
                          {selectedStudents.length}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Fee per student:</span>
                        <span className="font-medium text-gray-900">
                          ₹{total}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm pt-2 border-t border-gray-200">
                        <span className="font-medium text-gray-700">
                          Total amount:
                        </span>
                        <span className="font-bold text-blue-600">
                          ₹
                          {(
                            Number(total) * selectedStudents.length
                          ).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading || selectedStudents.length === 0}
                  className="w-full py-2.5 px-4 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                      Processing...
                    </div>
                  ) : (
                    `Set Fee for ${selectedStudents.length} Student${selectedStudents.length !== 1 ? "s" : ""}`
                  )}
                </button>

                {/* Message Display */}
                {message && (
                  <div
                    className={`mt-4 p-3 rounded-lg flex items-start gap-2 ${
                      message.type === "success"
                        ? "bg-green-50 text-green-800"
                        : "bg-red-50 text-red-800"
                    }`}
                  >
                    {message.type === "success" ? (
                      <CheckCircle size={18} className="shrink-0 mt-0.5" />
                    ) : (
                      <XCircle size={18} className="shrink-0 mt-0.5" />
                    )}
                    <span className="text-sm">{message.text}</span>
                  </div>
                )}
              </form>
            ) : (
              // Course-wise Form
              <div className="space-y-5">
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                  <div className="flex items-start gap-3">
                    <GraduationCap className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-blue-900">
                        Course-wise fee feature
                      </p>
                      <p className="text-xs text-blue-700 mt-1">
                        Coming soon - Set fees for entire courses at once
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Select Course *
                  </label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={selectedCourse}
                    onChange={(e) => setSelectedCourse(e.target.value)}
                  >
                    <option value="">Choose a course</option>
                    <option value="bca">
                      BCA - Bachelor of Computer Applications
                    </option>
                    <option value="bba">
                      BBA - Bachelor of Business Administration
                    </option>
                    <option value="mba">
                      MBA - Master of Business Administration
                    </option>
                    <option value="bcom">B.Com - Bachelor of Commerce</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Course Fee *
                  </label>
                  <div className="relative">
                    <DollarSign
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                      size={18}
                    />
                    <input
                      type="number"
                      placeholder="Enter course fee"
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={courseFee}
                      onChange={(e) => setCourseFee(Number(e.target.value))}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Due Date *
                  </label>
                  <div className="relative">
                    <Calendar
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                      size={18}
                    />
                    <input
                      type="date"
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <button
                  disabled
                  className="w-full py-2.5 px-4 bg-gray-100 text-gray-500 font-medium rounded-lg cursor-not-allowed"
                >
                  <Clock className="inline w-4 h-4 mr-2" />
                  Coming Soon
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Activity Section */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">Recent Fee Activity</h3>
          <button className="text-sm text-blue-600 hover:text-blue-700">
            View all
          </button>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-4 py-3 border-b border-gray-100 last:border-0"
            >
              <div className="p-2 bg-blue-50 rounded-lg">
                <DollarSign className="w-4 h-4 text-blue-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">
                  Fee set for 5 students
                </p>
                <p className="text-xs text-gray-500">Today, 10:30 AM</p>
              </div>
              <span className="text-sm font-medium text-gray-900">₹45,000</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
