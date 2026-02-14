import { useEffect, useState } from "react";
import api from "../../api/axios";
import {
  Calendar,
  Users,
  CheckCircle,
  XCircle,
  Download,
  Upload,
  Filter,
} from "lucide-react";

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
    // Set today's date as default in YYYY-MM-DD format
    const today = new Date();
    return today.toISOString().split("T")[0];
  });
  const [attendance, setAttendance] = useState<Attendance[]>([]);
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

      // Optional: Reset form or show success message
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
    <div className="min-h-screen bg-gray-900 text-white p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div
          className="bg-linear-to-r from-[#0a295e] to-[#bd2323] p-6 rounded-2xl"
          style={{ borderBottom: `3px solid #e6c235` }}
        >
          <h1 className="text-3xl font-bold mb-2">Attendance Management</h1>
          <p className="text-gray-400">Mark and manage student attendance</p>
        </div>

        {/* Controls Card */}
        <div className="bg-gray-800 rounded-xl p-6 mb-6 border border-gray-700 mt-10">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">
                <Calendar className="inline w-4 h-4 mr-2" />
                Date
              </label>
              <input
                type="date"
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#bd2323] focus:ring-2 focus:ring-[#bd2323]/30"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">
                Subject
              </label>
              <select
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#0a295e] focus:ring-2 focus:ring-[#0a295e]/30"
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
              <label className="block text-gray-300 text-sm font-medium mb-2">
                <Filter className="inline w-4 h-4 mr-2" />
                Filter by Status
              </label>
              <select
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#e6c235] focus:ring-2 focus:ring-[#e6c235]/30"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              >
                <option value="all">All Students</option>
                <option value="present">Present Only</option>
                <option value="absent">Absent Only</option>
              </select>
            </div>

            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">
                Search Students
              </label>
              <input
                type="text"
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#bd2323] focus:ring-2 focus:ring-[#bd2323]/30"
                placeholder="Search by name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap gap-3 mb-4">
            <button
              onClick={() => markAll("present")}
              className="flex items-center px-4 py-2 bg-green-600/20 text-green-400 rounded-lg hover:bg-green-600/30 transition-colors border border-green-600/30"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Mark All Present
            </button>
            <button
              onClick={() => markAll("absent")}
              className="flex items-center px-4 py-2 bg-red-600/20 text-red-400 rounded-lg hover:bg-red-600/30 transition-colors border border-red-600/30"
            >
              <XCircle className="w-4 h-4 mr-2" />
              Mark All Absent
            </button>
            <button
              onClick={exportAttendance}
              disabled={!date || !subject}
              className="flex items-center px-4 py-2 bg-[#0a295e]/20 text-blue-400 rounded-lg hover:bg-[#0a295e]/30 transition-colors border border-[#0a295e]/30 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 bg-gray-700/30 rounded-lg">
              <div className="text-2xl font-bold text-white">
                {students.length}
              </div>
              <div className="text-gray-400 text-sm">Total Students</div>
            </div>
            <div className="text-center p-4 bg-green-600/10 rounded-lg border border-green-600/20">
              <div className="text-2xl font-bold text-green-400">
                {presentCount}
              </div>
              <div className="text-gray-400 text-sm">Present</div>
            </div>
            <div className="text-center p-4 bg-red-600/10 rounded-lg border border-red-600/20">
              <div className="text-2xl font-bold text-red-400">
                {absentCount}
              </div>
              <div className="text-gray-400 text-sm">Absent</div>
            </div>
          </div>
        </div>

        {/* Attendance Table */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">Student Attendance</h2>
            <span className="text-gray-400">
              <Users className="inline w-4 h-4 mr-1" />
              {filteredStudents.length} students
            </span>
          </div>

          {loading && students.length === 0 ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#bd2323]"></div>
              <p className="mt-2 text-gray-400">Loading students...</p>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="text-center py-12">
              <Users className="mx-auto h-12 w-12 text-gray-400 mb-3" />
              <p className="text-gray-400">No students found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">
                      Roll No.
                    </th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">
                      Student Name
                    </th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">
                      Email
                    </th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">
                      Attendance Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map((student, index) => (
                    <tr
                      key={student._id}
                      className="border-b border-gray-700/50 hover:bg-gray-700/30 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <div className="w-8 h-8 flex items-center justify-center bg-gray-700 rounded-full">
                          {index + 1}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium">{student.name}</div>
                      </td>
                      <td className="py-3 px-4 text-gray-300">
                        {student.email}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() =>
                              handleAttendanceChange(student._id, "present")
                            }
                            className={`px-4 py-2 rounded-lg transition-all ${
                              attendance[student._id] === "present"
                                ? "bg-green-600 text-white shadow-lg scale-105"
                                : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                            }`}
                          >
                            <CheckCircle className="inline w-4 h-4 mr-2" />
                            Present
                          </button>
                          <button
                            onClick={() =>
                              handleAttendanceChange(student._id, "absent")
                            }
                            className={`px-4 py-2 rounded-lg transition-all ${
                              attendance[student._id] === "absent"
                                ? "bg-red-600 text-white shadow-lg scale-105"
                                : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                            }`}
                          >
                            <XCircle className="inline w-4 h-4 mr-2" />
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

        {/* Submit Section */}
        <div className="mt-6 bg-gray-800 rounded-xl p-6 border border-gray-700">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div>
              <h3 className="text-lg font-semibold mb-2">
                Ready to submit attendance?
              </h3>
              <p className="text-gray-400 text-sm">
                {date &&
                  new Date(date).toLocaleDateString("en-US", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                {subject && ` • ${subject}`}
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={submitAttendance}
                disabled={!date || !subject || loading}
                className="px-6 py-3 bg-linear-to-r from-[#bd2323] to-[#0a295e] text-white font-semibold rounded-lg hover:shadow-lg hover:shadow-[#bd2323]/20 active:scale-[0.98] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white mr-2"></div>
                    Submitting...
                  </>
                ) : (
                  <>
                    <Upload className="w-5 h-5 mr-2" />
                    Submit Attendance
                  </>
                )}
              </button>

              <button
                onClick={() => {
                  setDate(new Date().toISOString().split("T")[0]);
                  setSubject("");
                }}
                className="px-6 py-3 bg-gray-700 text-white font-semibold rounded-lg hover:bg-gray-600 transition-colors"
              >
                Reset
              </button>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-6 p-4 bg-gray-800/50 rounded-lg border border-gray-700">
          <h4 className="font-semibold text-[#e6c235] mb-2">Instructions:</h4>
          <ul className="text-gray-400 text-sm space-y-1">
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
  );
}
