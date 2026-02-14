import { useEffect, useState } from "react";
import api from "../../api/axios";
import {
  Users,
  DollarSign,
  Calendar,
  BookOpen,
  CheckCircle,
  XCircle,
  Search,
  GraduationCap,
} from "lucide-react";

interface Student {
  _id: string;
  name: string;
  email?: string;
  course?: string; // For future use
  semester?: number; // For future use
}

// Future course structure (commented for now)
/*
interface Course {
  id: string;
  name: string;
  code: string;
  duration: string;
  fee: number;
}

const courses: Course[] = [
  { id: "bca", name: "BCA", code: "BCA", duration: "3 Years", fee: 45000 },
  { id: "bba", name: "BBA", code: "BBA", duration: "3 Years", fee: 50000 },
  { id: "mba", name: "MBA", code: "MBA", duration: "2 Years", fee: 80000 },
  { id: "bcom", name: "B.Com", code: "BCOM", duration: "3 Years", fee: 30000 },
  { id: "mcom", name: "M.Com", code: "MCOM", duration: "2 Years", fee: 40000 },
  { id: "bsc", name: "B.Sc", code: "BSC", duration: "3 Years", fee: 40000 },
  { id: "msc", name: "M.Sc", code: "MSC", duration: "2 Years", fee: 60000 },
];
*/

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

  // Future feature: Course-wise fee setting
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

  // Filter students based on search and course
  const filteredStudents = students.filter((student) => {
    const matchesSearch =
      student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (student.email?.toLowerCase() || "").includes(searchTerm.toLowerCase());
    const matchesCourse =
      filterCourse === "all" || student.course === filterCourse;
    return matchesSearch && matchesCourse;
  });

  // Handle select all
  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents(filteredStudents.map((s) => s._id));
    }
    setSelectAll(!selectAll);
  };

  // Handle individual student selection
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

  // Handle bulk fee submission
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
      // Submit fee for all selected students
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

      // Reset form
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

  // Future: Handle course-wise fee setting
  /*
  const handleCourseWiseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedCourse) {
      setMessage({
        type: 'error',
        text: "Please select a course"
      });
      return;
    }

    if (!courseFee || !dueDate) {
      setMessage({
        type: 'error',
        text: "Course fee and due date are required"
      });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      // Filter students by selected course
      const courseStudents = students.filter(s => s.course === selectedCourse);
      
      if (courseStudents.length === 0) {
        setMessage({
          type: 'error',
          text: "No students found in this course"
        });
        return;
      }

      // Submit fee for all students in the course
      const promises = courseStudents.map(student =>
        api.post("/fee/set", { 
          student: student._id, 
          total: Number(courseFee), 
          dueDate 
        })
      );

      await Promise.all(promises);
      
      setMessage({
        type: 'success',
        text: `Fee set successfully for ${courseStudents.length} students in ${selectedCourse} course!`
      });

      // Reset form
      setSelectedCourse("");
      setCourseFee("");
      setDueDate("");
      
    } catch (err: any) {
      setMessage({
        type: 'error',
        text: err.response?.data?.message || "Error setting course-wise fee"
      });
    } finally {
      setLoading(false);
    }
  };
  */

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Toggle between individual and course-wise (Future feature) */}
        <div className="mb-6 flex space-x-4">
          <button
            onClick={() => setEnableCourseWise(false)}
            className={`px-6 py-3 rounded-lg font-medium transition-all ${
              !enableCourseWise
                ? "bg-[#bd2323] text-white shadow-lg"
                : "bg-gray-800 text-gray-400 hover:bg-gray-700"
            }`}
          >
            <Users className="inline mr-2" size={18} />
            Bulk Student Selection
          </button>
          <button
            onClick={() => setEnableCourseWise(true)}
            className={`px-6 py-3 rounded-lg font-medium transition-all ${
              enableCourseWise
                ? "bg-[#0a295e] text-white shadow-lg"
                : "bg-gray-800 text-gray-400 hover:bg-gray-700"
            }`}
          >
            <BookOpen className="inline mr-2" size={18} />
            Course-wise (Future)
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Student Selection Panel */}
          <div className="lg:col-span-2">
            <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
              {/* Search and Filter Bar */}
              <div className="p-4 border-b border-gray-700 bg-gray-850">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1 relative">
                    <Search
                      className="absolute left-3 top-3 text-gray-400"
                      size={18}
                    />
                    <input
                      type="text"
                      placeholder="Search students..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-[#bd2323]"
                    />
                  </div>
                  <select
                    value={filterCourse}
                    onChange={(e) => setFilterCourse(e.target.value)}
                    className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-[#bd2323]"
                  >
                    <option value="all">All Courses</option>
                    <option value="bca">BCA</option>
                    <option value="bba">BBA</option>
                    <option value="mba">MBA</option>
                    <option value="bcom">B.Com</option>
                  </select>
                </div>
              </div>

              {/* Student List Header */}
              <div className="px-4 py-3 bg-gray-750 border-b border-gray-700 flex items-center">
                <div className="flex items-center w-8 mr-4">
                  <input
                    type="checkbox"
                    checked={selectAll}
                    onChange={handleSelectAll}
                    className="w-4 h-4 rounded border-gray-600 text-[#bd2323] focus:ring-[#bd2323] focus:ring-offset-0 bg-gray-700"
                  />
                </div>
                <div className="flex-1 font-medium text-gray-300">
                  Student Name
                </div>
                <div className="w-24 font-medium text-gray-300">Course</div>
                <div className="w-24 font-medium text-gray-300">Status</div>
              </div>

              {/* Student List */}
              <div className="max-h-96 overflow-y-auto">
                {loading ? (
                  <div className="p-8 text-center text-gray-400">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#bd2323] mx-auto mb-4"></div>
                    Loading students...
                  </div>
                ) : filteredStudents.length === 0 ? (
                  <div className="p-8 text-center text-gray-400">
                    <Users size={48} className="mx-auto mb-4 opacity-50" />
                    No students found
                  </div>
                ) : (
                  filteredStudents.map((student) => (
                    <div
                      key={student._id}
                      className={`px-4 py-3 border-b border-gray-700 flex items-center hover:bg-gray-750 transition-colors ${
                        selectedStudents.includes(student._id)
                          ? "bg-gray-750"
                          : ""
                      }`}
                    >
                      <div className="flex items-center w-8 mr-4">
                        <input
                          type="checkbox"
                          checked={selectedStudents.includes(student._id)}
                          onChange={() => handleSelectStudent(student._id)}
                          className="w-4 h-4 rounded border-gray-600 text-[#bd2323] focus:ring-[#bd2323] focus:ring-offset-0 bg-gray-700"
                        />
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-white">
                          {student.name}
                        </div>
                        <div className="text-sm text-gray-400">
                          {student.email || "No email"}
                        </div>
                      </div>
                      <div className="w-24">
                        <span className="px-2 py-1 text-xs rounded-full bg-gray-700 text-gray-300">
                          {student.course || "Not set"}
                        </span>
                      </div>
                      <div className="w-24">
                        <span className="px-2 py-1 text-xs rounded-full bg-green-900/30 text-green-400 border border-green-800">
                          Active
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Selection Summary */}
              <div className="p-4 bg-gray-750 border-t border-gray-700">
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">
                    Selected:{" "}
                    <span className="text-white font-bold">
                      {selectedStudents.length}
                    </span>{" "}
                    students
                  </span>
                  <button
                    onClick={() => setSelectedStudents([])}
                    className="text-sm text-gray-400 hover:text-white transition-colors"
                  >
                    Clear all
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Fee Setting Form */}
          <div className="lg:col-span-1">
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 sticky top-4">
              <h2 className="text-xl font-bold mb-6 flex items-center">
                <DollarSign className="mr-2" style={{ color: "#e6c235" }} />
                Set Fee Details
              </h2>

              {!enableCourseWise ? (
                // Bulk Student Selection Form
                <form onSubmit={handleBulkSubmit} className="space-y-6">
                  {/* Total Fee */}
                  <div>
                    <label className="block text-gray-300 text-sm font-medium mb-2">
                      Total Fee Amount *
                    </label>
                    <div className="relative">
                      <DollarSign
                        className="absolute left-3 top-3 text-gray-400"
                        size={18}
                      />
                      <input
                        type="number"
                        placeholder="Enter amount"
                        className="w-full pl-10 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-[#bd2323]"
                        value={total}
                        onChange={(e) => setTotal(Number(e.target.value))}
                        min="0"
                      />
                    </div>
                  </div>

                  {/* Due Date */}
                  <div>
                    <label className="block text-gray-300 text-sm font-medium mb-2">
                      Due Date *
                    </label>
                    <div className="relative">
                      <Calendar
                        className="absolute left-3 top-3 text-gray-400"
                        size={18}
                      />
                      <input
                        type="date"
                        className="w-full pl-10 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-[#bd2323]"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={loading || selectedStudents.length === 0}
                    className="w-full py-3 px-4 bg-linear-to-r from-[#bd2323] to-[#0a295e] text-white font-semibold rounded-lg hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ boxShadow: "0 4px 15px rgba(189, 35, 35, 0.3)" }}
                  >
                    {loading ? (
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                        Processing...
                      </div>
                    ) : (
                      `Set Fee for ${selectedStudents.length} Student${selectedStudents.length !== 1 ? "s" : ""}`
                    )}
                  </button>

                  {/* Summary */}
                  {selectedStudents.length > 0 && total && (
                    <div className="mt-4 p-4 bg-gray-700 rounded-lg">
                      <div className="text-sm text-gray-300 mb-2">Summary:</div>
                      <div className="flex justify-between mb-1">
                        <span>Students:</span>
                        <span className="font-bold">
                          {selectedStudents.length}
                        </span>
                      </div>
                      <div className="flex justify-between mb-1">
                        <span>Fee per student:</span>
                        <span className="font-bold">₹{total}</span>
                      </div>
                      <div className="flex justify-between pt-2 border-t border-gray-600 mt-2">
                        <span>Total amount:</span>
                        <span className="font-bold text-[#e6c235]">
                          ₹{Number(total) * selectedStudents.length}
                        </span>
                      </div>
                    </div>
                  )}
                </form>
              ) : (
                // Future: Course-wise Fee Form (commented)
                <div className="space-y-6 opacity-75">
                  <div className="p-4 bg-gray-700/50 rounded-lg border border-[#e6c235] border-opacity-30">
                    <p className="text-sm text-gray-300 flex items-center">
                      <GraduationCap
                        size={18}
                        className="mr-2 text-[#e6c235]"
                      />
                      Course-wise fee feature (Coming Soon)
                    </p>
                  </div>

                  <div>
                    <label className="block text-gray-300 text-sm font-medium mb-2">
                      Select Course *
                    </label>
                    <select
                      className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-[#0a295e]"
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
                    <label className="block text-gray-300 text-sm font-medium mb-2">
                      Course Fee *
                    </label>
                    <div className="relative">
                      <DollarSign
                        className="absolute left-3 top-3 text-gray-400"
                        size={18}
                      />
                      <input
                        type="number"
                        placeholder="Enter course fee"
                        className="w-full pl-10 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-[#0a295e]"
                        value={courseFee}
                        onChange={(e) => setCourseFee(Number(e.target.value))}
                      />
                    </div>
                  </div>

                  <button
                    disabled
                    className="w-full py-3 px-4 bg-gray-600 text-gray-300 font-semibold rounded-lg cursor-not-allowed"
                  >
                    Coming Soon
                  </button>
                </div>
              )}

              {/* Message Display */}
              {message && (
                <div
                  className={`mt-4 p-3 rounded-lg flex items-center ${
                    message.type === "success"
                      ? "bg-green-900/30 text-green-400 border border-green-800"
                      : "bg-red-900/30 text-red-400 border border-red-800"
                  }`}
                >
                  {message.type === "success" ? (
                    <CheckCircle size={18} className="mr-2 shrink-0" />
                  ) : (
                    <XCircle size={18} className="mr-2 shrink-0" />
                  )}
                  <span className="text-sm">{message.text}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
