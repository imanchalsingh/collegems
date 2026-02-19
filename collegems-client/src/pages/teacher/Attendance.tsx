import { useEffect, useState } from "react";
import {
  Calendar,
  Users,
  CheckCircle,
  XCircle,
  Download,
  Upload,
  Filter,
  Search,
  BookOpen,
  Clock,
  UserCheck,
  UserX,
  RefreshCw,
} from "lucide-react";
import api from "../../api/axios";

interface Attendance {
  studentId: string;
  student?: string;
  status: "present" | "absent";
  studentName: string;
  studentEmail: string;
}

export default function TeacherAttendance() {
  const [students, setStudents] = useState<any[]>([]);
  const [date, setDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });
  const [attendance, setAttendance] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [subject, setSubject] = useState("");
  const [subjects, setSubjects] = useState<string[]>([]);

  useEffect(() => {
    fetchStudents();
    fetchSubjects();
  }, []);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const res = await api.get("/users/students");
      setStudents(res.data);

      // Initialize all students as present by default
      const initialAttendance: any = {};
      res.data.forEach((student: any) => {
        initialAttendance[student._id] = "present";
      });
      setAttendance(initialAttendance);
    } catch (error) {
      console.error("Error fetching students:", error);
      alert("Failed to load students");
    } finally {
      setLoading(false);
    }
  };

  const fetchSubjects = async () => {
    // Mock subjects - replace with actual API call
    setSubjects([
      "Mathematics",
      "Physics",
      "Chemistry",
      "Computer Science",
      "English",
    ]);
  };

  const handleAttendanceChange = (studentId: string, status: string) => {
    setAttendance((prev) => ({
      ...prev,
      [studentId]: status,
    }));
  };

  const markAll = (status: string) => {
    const newAttendance: any = {};
    students.forEach((student) => {
      newAttendance[student._id] = status;
    });
    setAttendance(newAttendance);
  };

  const submitAttendance = async () => {
    if (!date) {
      alert("Please select a date");
      return;
    }

    if (!subject) {
      alert("Please select a subject");
      return;
    }

    const records = students.map((s) => ({
      studentId: s._id,
      status: attendance[s._id] || "absent",
      studentName: s.name,
      studentEmail: s.email,
    }));

    try {
      setLoading(true);
      await api.post("/attendance/mark", {
        date,
        records,
        subject,
      });

      alert("✅ Attendance marked successfully!");
    } catch (error: any) {
      console.error("Error submitting attendance:", error);
      alert(error.response?.data?.message || "Failed to submit attendance");
    } finally {
      setLoading(false);
    }
  };

  const exportAttendance = () => {
    const data = students.map((s) => ({
      Name: s.name,
      Email: s.email,
      Status: attendance[s._id] || "absent",
      Date: new Date(date).toLocaleDateString(),
      Subject: subject,
    }));

    const csv = convertToCSV(data);
    downloadCSV(csv, `attendance_${date}.csv`);
  };

  const convertToCSV = (data: any[]) => {
    const headers = Object.keys(data[0]).join(",");
    const rows = data.map((row) => Object.values(row).join(","));
    return [headers, ...rows].join("\n");
  };

  const downloadCSV = (csv: string, filename: string) => {
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const filteredStudents = students.filter((student) => {
    if (filter === "present" && attendance[student._id] !== "present")
      return false;
    if (filter === "absent" && attendance[student._id] !== "absent")
      return false;

    if (search) {
      return (
        student.name.toLowerCase().includes(search.toLowerCase()) ||
        student.email.toLowerCase().includes(search.toLowerCase())
      );
    }

    return true;
  });

  const presentCount = Object.values(attendance).filter(
    (status: any) => status === "present",
  ).length;
  const absentCount = students.length - presentCount;

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
              <p className="text-2xl font-bold text-gray-900">
                {students.length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-50 rounded-lg">
              <UserCheck className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Present</p>
              <p className="text-2xl font-bold text-green-600">
                {presentCount}
              </p>
            </div>
          </div>
          <div className="mt-2 w-full bg-gray-200 rounded-full h-1.5">
            <div
              className="bg-green-600 h-1.5 rounded-full"
              style={{ width: `${(presentCount / students.length) * 100}%` }}
            ></div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-red-50 rounded-lg">
              <UserX className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Absent</p>
              <p className="text-2xl font-bold text-red-600">{absentCount}</p>
            </div>
          </div>
          <div className="mt-2 w-full bg-gray-200 rounded-full h-1.5">
            <div
              className="bg-red-600 h-1.5 rounded-full"
              style={{ width: `${(absentCount / students.length) * 100}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Controls Card */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {/* Main Controls */}
        <div className="p-6 border-b border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Calendar className="inline w-4 h-4 mr-1 text-gray-500" />
                Date
              </label>
              <input
                type="date"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <BookOpen className="inline w-4 h-4 mr-1 text-gray-500" />
                Subject
              </label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              >
                <option value="">Select Subject</option>
                {subjects.map((sub) => (
                  <option key={sub} value={sub}>
                    {sub}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Filter className="inline w-4 h-4 mr-1 text-gray-500" />
                Filter Status
              </label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              >
                <option value="all">All Students</option>
                <option value="present">Present Only</option>
                <option value="absent">Absent Only</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Search className="inline w-4 h-4 mr-1 text-gray-500" />
                Search
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Search by name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-3 mt-4 pt-4 border-t border-gray-200">
            <span className="text-sm font-medium text-gray-700">
              Quick Actions:
            </span>
            <button
              onClick={() => markAll("present")}
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors text-sm font-medium"
            >
              <CheckCircle className="w-4 h-4" />
              Mark All Present
            </button>
            <button
              onClick={() => markAll("absent")}
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium"
            >
              <XCircle className="w-4 h-4" />
              Mark All Absent
            </button>
          </div>
        </div>

        {/* Attendance Table */}
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Student Attendance
            </h2>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Users className="w-4 h-4" />
              <span>{filteredStudents.length} students</span>
            </div>
          </div>

          {loading && students.length === 0 ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent"></div>
              <p className="mt-2 text-gray-500">Loading students...</p>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="text-center py-12">
              <Users className="mx-auto h-12 w-12 text-gray-300 mb-3" />
              <p className="text-gray-500">No students found</p>
              <p className="text-sm text-gray-400 mt-1">
                Try adjusting your search or filters
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">
                      #
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">
                      Student Name
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">
                      Email
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">
                      Attendance Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredStudents.map((student, index) => (
                    <tr
                      key={student._id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <span className="text-sm text-gray-500">
                          {index + 1}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-gray-900">
                          {student.name}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm text-gray-600">
                          {student.email}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() =>
                              handleAttendanceChange(student._id, "present")
                            }
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                              attendance[student._id] === "present"
                                ? "bg-green-100 text-green-700 border border-green-200"
                                : "bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200"
                            }`}
                          >
                            <CheckCircle
                              className={`w-4 h-4 ${
                                attendance[student._id] === "present"
                                  ? "text-green-600"
                                  : "text-gray-400"
                              }`}
                            />
                            Present
                          </button>
                          <button
                            onClick={() =>
                              handleAttendanceChange(student._id, "absent")
                            }
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                              attendance[student._id] === "absent"
                                ? "bg-red-100 text-red-700 border border-red-200"
                                : "bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200"
                            }`}
                          >
                            <XCircle
                              className={`w-4 h-4 ${
                                attendance[student._id] === "absent"
                                  ? "text-red-600"
                                  : "text-gray-400"
                              }`}
                            />
                            Absent
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Submit Section */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              Ready to submit attendance?
            </h3>
            <div className="flex items-center gap-3 text-sm text-gray-500">
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                <span>
                  {date &&
                    new Date(date).toLocaleDateString("en-US", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                </span>
              </div>
              {subject && (
                <>
                  <span>•</span>
                  <div className="flex items-center gap-1">
                    <BookOpen className="w-4 h-4" />
                    <span>{subject}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="flex gap-3 w-full md:w-auto">
            <button
              onClick={submitAttendance}
              disabled={!date || !subject || loading}
              className="flex-1 md:flex-none px-6 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  Submitting...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Submit Attendance
                </>
              )}
            </button>

            <button
              onClick={() => {
                setDate(new Date().toISOString().split("T")[0]);
                setSubject("");
              }}
              className="px-6 py-2.5 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors"
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 rounded-xl border border-blue-100 p-4">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Clock className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <h4 className="font-medium text-blue-900 mb-1">
              Quick Instructions:
            </h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Select date and subject before marking attendance</li>
              <li>
                • Click "Present" or "Absent" buttons to mark individual student
                attendance
              </li>
              <li>• Use "Mark All" buttons for quick bulk operations</li>
              <li>• Filter and search to find specific students</li>
              <li>• Export attendance data as CSV for records</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
