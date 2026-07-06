import { useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Calendar,
  Download,
  Users,
  GraduationCap,
  BookOpen,
  Building2,
  ChevronDown,
  ChevronUp,
  FileText,
  Filter,
  RefreshCw,
  Search,
  CheckCircle,
  DollarSign
} from "lucide-react";
import api from "../api/axios";
import { jsPDF } from "jspdf";
import { extractArray } from "../utils/apiHelpers";

// Type definitions matching backend report schema
interface CourseInfo {
  name: string;
  code: string;
  semester?: number;
  teacher?: string;
}

interface StudentAttendanceRecord {
  date: string;
  status: "present" | "absent";
  course: string;
}

interface StudentAttendanceSummary {
  total: number;
  present: number;
  absent: number;
  percentage: number;
  records: StudentAttendanceRecord[];
}

interface ResultRecord {
  course: string;
  code: string;
  internalMarks: number;
  externalMarks: number;
  practicalMarks: number;
  totalMarks: number;
  grade: string;
  status: string;
}

interface LeaveRecord {
  startDate: string;
  endDate: string;
  reason: string;
  status: "Pending" | "Approved" | "Rejected";
  type: string;
}

interface SubmissionRecord {
  title: string;
  course: string;
  dueDate: string;
  submittedAt: string;
  marks: number;
}

interface StudentReport {
  id: string;
  name: string;
  email: string;
  phone: string;
  studentId: string;
  course: string;
  semester: string;
  courses: CourseInfo[];
  attendance: StudentAttendanceSummary;
  results: ResultRecord[];
  leaves: LeaveRecord[];
  submissions: SubmissionRecord[];
}

interface TeacherAttendanceRecord {
  date: string;
  status: "Present" | "Absent" | "Late";
}

interface TeacherAttendanceSummary {
  total: number;
  present: number;
  absent: number;
  late: number;
  percentage: number;
  records: TeacherAttendanceRecord[];
}

interface SalaryRecord {
  total: number;
  paid: number;
  status: string;
  dueDate: string;
}

interface TeacherReport {
  id: string;
  name: string;
  email: string;
  phone: string;
  teacherId: string;
  department: string;
  courses: CourseInfo[];
  attendance: TeacherAttendanceSummary;
  leaves: LeaveRecord[];
  salaries: SalaryRecord[];
}

// Filter option types
interface FilterOptions {
  departments: string[];
  courses: { _id: string; name: string; code: string; semester: number; department: string }[];
  semesters: string[];
  students: { _id: string; name: string; studentId: string; semester: string; course: string; email: string }[];
  teachers: { _id: string; name: string; teacherId: string; department: string; email: string }[];
}

export default function ReportGenerator() {
  const navigate = useNavigate();
  const [reportType, setReportType] = useState<"student" | "teacher">("student");
  
  // Filter States
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [selectedDept, setSelectedDept] = useState<string>("");
  const [selectedSemester, setSelectedSemester] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState<string>("");

  // Options populated from backend
  const [filterOptions, setFilterOptions] = useState<FilterOptions | null>(null);
  
  // Data States
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingFilters, setLoadingFilters] = useState<boolean>(true);
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchFilters();
  }, []);

  const fetchFilters = async () => {
    try {
      setLoadingFilters(true);
      const res = await api.get("/reports/filters");
      setFilterOptions(res.data);
    } catch (err) {
      console.error("Failed to load filters", err);
    } finally {
      setLoadingFilters(false);
    }
  };

  const handleGenerateReport = async () => {
    try {
      setLoading(true);
      setExpandedRows({});
      const params: Record<string, string> = { type: reportType };
      if (selectedUser) params.userId = selectedUser;
      if (selectedDept) params.department = selectedDept;
      if (selectedSemester && reportType === "student") params.semester = selectedSemester;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const res = await api.get("/reports/generate", { params });
      setReports(res.data.data || []);
    } catch (err) {
      console.error("Failed to generate report", err);
      alert("Failed to generate report. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetFilters = () => {
    setSelectedUser("");
    setSelectedDept("");
    setSelectedSemester("");
    setStartDate("");
    setEndDate("");
    setSearchTerm("");
    setReports([]);
  };

  const toggleRow = (id: string) => {
    setExpandedRows((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // CSV Export Logic
  const handleExportCSV = () => {
    if (reports.length === 0) {
      alert("No data available to export.");
      return;
    }

    let csvContent = "data:text/csv;charset=utf-8,";
    
    if (reportType === "student") {
      csvContent += "Student Name,Email,Student ID,Course/Dept,Semester,Phone,Total Classes,Present,Absent,Attendance %,Avg Marks,Leaves count\n";
      reports.forEach((student: StudentReport) => {
        const totalMarks = student.results.reduce((sum, r) => sum + r.totalMarks, 0);
        const avgMarks = student.results.length > 0 ? (totalMarks / student.results.length).toFixed(1) : "N/A";
        
        csvContent += `"${student.name}","${student.email}","${student.studentId}","${student.course}","${student.semester}","${student.phone}",${student.attendance.total},${student.attendance.present},${student.attendance.absent},${student.attendance.percentage}%,${avgMarks},${student.leaves.length}\n`;
      });
    } else {
      csvContent += "Teacher Name,Email,Teacher ID,Department,Phone,Courses Taught,Total Days,Present,Absent,Late,Attendance %,Leaves Count\n";
      reports.forEach((teacher: TeacherReport) => {
        csvContent += `"${teacher.name}","${teacher.email}","${teacher.teacherId}","${teacher.department}","${teacher.phone}",${teacher.courses.length},${teacher.attendance.total},${teacher.attendance.present},${teacher.attendance.absent},${teacher.attendance.late},${teacher.attendance.percentage}%,${teacher.leaves.length}\n`;
      });
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${reportType}_report_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // PDF Export Logic
  const handleExportPDF = () => {
    if (reports.length === 0) {
      alert("No data available to export.");
      return;
    }

    const doc = new jsPDF();
    const today = new Date().toLocaleDateString();

    // Title Block
    doc.setFillColor(37, 99, 235); // Blue color
    doc.rect(0, 0, 210, 40, "F");
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(255, 255, 255);
    doc.text("COLLEGE MANAGEMENT SYSTEM", 14, 18);
    
    doc.setFontSize(14);
    doc.setFont("helvetica", "normal");
    doc.text(`Official HOD Report: ${reportType.toUpperCase()}S`, 14, 28);
    
    doc.setFontSize(10);
    doc.text(`Date Generated: ${today}`, 150, 28);

    let y = 50;

    // Filters Summary
    doc.setFontSize(11);
    doc.setTextColor(55, 65, 81);
    doc.setFont("helvetica", "bold");
    doc.text("Filters Applied:", 14, y);
    doc.setFont("helvetica", "normal");
    const filterText = `Department: ${selectedDept || "All"} | Semester: ${selectedSemester || "All"} | Date Range: ${startDate || "Any"} to ${endDate || "Any"}`;
    doc.text(filterText, 45, y);
    y += 10;
    
    doc.setDrawColor(229, 231, 235);
    doc.line(14, y, 196, y);
    y += 10;

    // Report items
    reports.forEach((item: any, index: number) => {
      // Add page if close to boundary
      if (y > 250) {
        doc.addPage();
        y = 20;
      }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(17, 24, 39);
      doc.text(`${index + 1}. ${item.name} (${item.studentId || item.teacherId || "N/A"})`, 14, y);
      y += 6;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(75, 85, 99);
      if (reportType === "student") {
        doc.text(`Course/Major: ${item.course}  |  Semester: ${item.semester}  |  Email: ${item.email}  |  Phone: ${item.phone}`, 14, y);
        y += 6;
        doc.text(`Attendance: ${item.attendance.percentage}% (${item.attendance.present}/${item.attendance.total} classes)  |  Leaves Applied: ${item.leaves.length}`, 14, y);
        y += 8;

        // Results summary
        if (item.results.length > 0) {
          doc.setFont("helvetica", "bold");
          doc.text("Academic Performance:", 14, y);
          doc.setFont("helvetica", "normal");
          y += 5;
          item.results.forEach((r: any) => {
            doc.text(`- ${r.course} (${r.code}): Total Marks = ${r.totalMarks}, Grade = ${r.grade}`, 20, y);
            y += 5;
          });
          y += 3;
        }

        // Submissions summary
        if (item.submissions.length > 0) {
          doc.setFont("helvetica", "bold");
          doc.text("Assignment Activity:", 14, y);
          doc.setFont("helvetica", "normal");
          y += 5;
          item.submissions.slice(0, 3).forEach((sub: any) => {
            doc.text(`- ${sub.title}: Score = ${sub.marks} (Submitted on: ${new Date(sub.submittedAt).toLocaleDateString()})`, 20, y);
            y += 5;
          });
          y += 3;
        }
      } else {
        // Teacher
        doc.text(`Department: ${item.department}  |  Email: ${item.email}  |  Phone: ${item.phone}`, 14, y);
        y += 6;
        doc.text(`Attendance Rate: ${item.attendance.percentage}%  |  Classes Taught: ${item.courses.length}  |  Leaves Applied: ${item.leaves.length}`, 14, y);
        y += 8;

        // Salary summary
        if (item.salaries.length > 0) {
          doc.setFont("helvetica", "bold");
          doc.text("Compensation Details:", 14, y);
          doc.setFont("helvetica", "normal");
          y += 5;
          item.salaries.forEach((s: any) => {
            doc.text(`- Base Package: $${s.total} | Paid: $${s.paid} | Status: ${s.status}`, 20, y);
            y += 5;
          });
          y += 3;
        }
      }

      // Separator
      doc.setDrawColor(243, 244, 246);
      doc.line(14, y, 196, y);
      y += 8;
    });

    doc.save(`${reportType}_report_${new Date().toISOString().split("T")[0]}.pdf`);
  };

  // Filter local results based on text input
  const filteredReports = reports.filter((item) =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.studentId && item.studentId.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (item.teacherId && item.teacherId.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Compute summary stats for visual cards
  const stats = {
    totalRecords: filteredReports.length,
    avgAttendance:
      filteredReports.length > 0
        ? Math.round(
            filteredReports.reduce((sum, r) => sum + r.attendance.percentage, 0) /
              filteredReports.length
          )
        : 0,
    leavesApplied: filteredReports.reduce((sum, r) => sum + r.leaves.length, 0),
    extraStat:
      reportType === "student"
        ? filteredReports.reduce((sum, r) => sum + (r.results?.length || 0), 0) // Total Exams
        : filteredReports.reduce((sum, r) => sum + (r.courses?.length || 0), 0), // Total Courses Taught
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <button
            onClick={() => navigate("/hod/dashboard")}
            className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors mb-3 font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </button>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-3">
            <FileText className="w-8 h-8 text-blue-600" />
            Report Generator
          </h1>
          <p className="text-gray-500 mt-1">
            Generate, analyze, and export comprehensive Student and Teacher records.
          </p>
        </div>

        {reports.length > 0 && (
          <div className="flex items-center gap-3 self-end sm:self-auto">
            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 bg-white text-gray-700 text-sm font-semibold rounded-lg hover:bg-gray-50 transition-colors shadow-sm cursor-pointer"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
            <button
              onClick={handleExportPDF}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-md cursor-pointer"
            >
              <FileText className="w-4 h-4" />
              Export PDF
            </button>
          </div>
        )}
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Filters Card */}
        <div className="lg:col-span-1 bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-6 h-fit sticky top-6">
          <div className="flex items-center gap-2 border-b border-gray-100 pb-4">
            <Filter className="w-5 h-5 text-gray-500" />
            <h2 className="text-lg font-bold text-gray-900">Filters</h2>
          </div>

          {/* Report Type Toggle */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Report Type
            </label>
            <div className="grid grid-cols-2 gap-2 bg-gray-100 p-1 rounded-lg">
              <button
                onClick={() => {
                  setReportType("student");
                  handleResetFilters();
                }}
                className={`py-2 px-3 rounded-md text-sm font-medium transition-all cursor-pointer ${
                  reportType === "student"
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Students
              </button>
              <button
                onClick={() => {
                  setReportType("teacher");
                  handleResetFilters();
                }}
                className={`py-2 px-3 rounded-md text-sm font-medium transition-all cursor-pointer ${
                  reportType === "teacher"
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Teachers
              </button>
            </div>
          </div>

          {/* Department Filter */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Department / Course
            </label>
            <select
              value={selectedDept}
              onChange={(e) => {
                setSelectedDept(e.target.value);
                setSelectedUser(""); // Clear specific user if dept changes
              }}
              className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loadingFilters}
            >
              <option value="">All Departments</option>
              {filterOptions?.departments.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>

          {/* Semester Filter (Students Only) */}
          {reportType === "student" && (
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Semester
              </label>
              <select
                value={selectedSemester}
                onChange={(e) => {
                  setSelectedSemester(e.target.value);
                  setSelectedUser("");
                }}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loadingFilters}
              >
                <option value="">All Semesters</option>
                {filterOptions?.semesters.map((sem) => (
                  <option key={sem} value={sem}>
                    Semester {sem}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Specific Student/Teacher Selection */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              {reportType === "student" ? "Select Student" : "Select Teacher"}
            </label>
            <select
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loadingFilters}
            >
              <option value="">All {reportType === "student" ? "Students" : "Teachers"}</option>
              {reportType === "student"
                ? filterOptions?.students
                    .filter((s) => !selectedDept || s.course === selectedDept)
                    .filter((s) => !selectedSemester || s.semester === selectedSemester)
                    .map((s) => (
                      <option key={s._id} value={s._id}>
                        {s.name} ({s.studentId})
                      </option>
                    ))
                : filterOptions?.teachers
                    .filter((t) => !selectedDept || t.department === selectedDept)
                    .map((t) => (
                      <option key={t._id} value={t._id}>
                        {t.name} ({t.teacherId})
                      </option>
                    ))}
            </select>
          </div>

          {/* Date Range Filters */}
          <div className="space-y-3">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
              Date Range
            </label>
            <div>
              <span className="text-[10px] text-gray-400 block mb-1">Start Date</span>
              <div className="relative">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div>
              <span className="text-[10px] text-gray-400 block mb-1">End Date</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-gray-100 flex flex-col gap-2">
            <button
              onClick={handleGenerateReport}
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 px-4 rounded-xl text-sm font-semibold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <FileText className="w-4 h-4" />
              )}
              Generate Report
            </button>
            <button
              onClick={handleResetFilters}
              className="w-full border border-gray-200 hover:bg-gray-50 text-gray-600 py-2 px-4 rounded-xl text-sm font-medium transition-all cursor-pointer"
            >
              Clear Filters
            </button>
          </div>
        </div>

        {/* Report Output Content */}
        <div className="lg:col-span-3 space-y-6">
          {/* Quick Statistics Header */}
          {reports.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-4">
                <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                  {reportType === "student" ? (
                    <GraduationCap className="w-6 h-6" />
                  ) : (
                    <Users className="w-6 h-6" />
                  )}
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium">Total Records</p>
                  <p className="text-xl font-bold text-gray-900">{stats.totalRecords}</p>
                </div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-4">
                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                  <CheckCircle className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium">Avg Attendance</p>
                  <p className="text-xl font-bold text-gray-900">{stats.avgAttendance}%</p>
                </div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-4">
                <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
                  <Calendar className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium">Total Leaves</p>
                  <p className="text-xl font-bold text-gray-900">{stats.leavesApplied}</p>
                </div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-4">
                <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
                  <BookOpen className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium">
                    {reportType === "student" ? "Total Results" : "Total Courses"}
                  </p>
                  <p className="text-xl font-bold text-gray-900">{stats.extraStat}</p>
                </div>
              </div>
            </div>
          )}

          {/* Search bar inside content */}
          {reports.length > 0 && (
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={`Search results by name or ID...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full bg-white shadow-sm"
              />
            </div>
          )}

          {/* Loading state */}
          {loading && (
            <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center shadow-sm">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-3 border-blue-600 border-t-transparent mb-4"></div>
              <p className="text-gray-500 font-medium">Aggregating records and compiling report...</p>
            </div>
          )}

          {/* Empty state */}
          {!loading && reports.length === 0 && (
            <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center shadow-sm">
              <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 border border-blue-100">
                <FileText className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-1">No Report Generated Yet</h3>
              <p className="text-gray-500 max-w-sm mx-auto mb-6">
                Choose a report type and adjust the filters on the left panel, then click "Generate Report".
              </p>
            </div>
          )}

          {/* Tables */}
          {!loading && reports.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    {reportType === "student" ? (
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-10"></th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Student</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">ID</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Course</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Semester</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Attendance %</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Leaves</th>
                      </tr>
                    ) : (
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-10"></th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Teacher</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">ID</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Department</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Courses Taught</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Attendance %</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Leaves</th>
                      </tr>
                    )}
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {filteredReports.map((item) => {
                      const isExpanded = !!expandedRows[item.id];
                      return (
                        <>
                          {/* Main Row */}
                          <tr
                            key={item.id}
                            className={`hover:bg-gray-50 transition-colors cursor-pointer ${
                              isExpanded ? "bg-blue-50/20" : ""
                            }`}
                            onClick={() => toggleRow(item.id)}
                          >
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              {isExpanded ? (
                                <ChevronUp className="w-4 h-4 text-gray-400" />
                              ) : (
                                <ChevronDown className="w-4 h-4 text-gray-400" />
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm">
                                  {item.name.charAt(0)}
                                </div>
                                <div>
                                  <div className="text-sm font-semibold text-gray-900">{item.name}</div>
                                  <div className="text-xs text-gray-500">{item.email}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-700">
                              {item.studentId || item.teacherId}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {item.course || item.department}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {reportType === "student" ? `Sem ${item.semester}` : `${item.courses.length} Classes`}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <span className={`text-sm font-bold ${
                                  item.attendance.percentage >= 75 ? "text-emerald-600" : "text-amber-600"
                                }`}>
                                  {item.attendance.percentage}%
                                </span>
                                <div className="w-16 bg-gray-200 rounded-full h-1.5 hidden sm:block">
                                  <div
                                    className={`h-1.5 rounded-full ${
                                      item.attendance.percentage >= 75 ? "bg-emerald-500" : "bg-amber-500"
                                    }`}
                                    style={{ width: `${item.attendance.percentage}%` }}
                                  ></div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {item.leaves.length} Applications
                            </td>
                          </tr>

                          {/* Expansion Row */}
                          {isExpanded && (
                            <tr>
                              <td colSpan={7} className="px-6 py-5 bg-gray-50/50 border-t border-b border-gray-200">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                  {reportType === "student" ? (
                                    <>
                                      {/* Left Card: Subjects & Marks */}
                                      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-4">
                                        <h4 className="text-sm font-bold text-gray-900 border-b border-gray-100 pb-2 flex items-center gap-2">
                                          <BookOpen className="w-4 h-4 text-blue-600" />
                                          Academic Performance & Courses
                                        </h4>
                                        {item.results.length === 0 ? (
                                          <p className="text-xs text-gray-500 py-2">No exam results published.</p>
                                        ) : (
                                          <div className="overflow-x-auto">
                                            <table className="min-w-full divide-y divide-gray-150">
                                              <thead>
                                                <tr className="text-left text-[10px] uppercase font-bold text-gray-400">
                                                  <th className="pb-2">Course</th>
                                                  <th className="pb-2">Internal</th>
                                                  <th className="pb-2">External</th>
                                                  <th className="pb-2">Total</th>
                                                  <th className="pb-2">Grade</th>
                                                </tr>
                                              </thead>
                                              <tbody className="divide-y divide-gray-100 text-xs">
                                                {item.results.map((res: any, idx: number) => (
                                                  <tr key={idx}>
                                                    <td className="py-2 text-gray-900 font-medium">
                                                      {res.course} ({res.code})
                                                    </td>
                                                    <td className="py-2 text-gray-600">{res.internalMarks}</td>
                                                    <td className="py-2 text-gray-600">{res.externalMarks}</td>
                                                    <td className="py-2 text-gray-900 font-bold">{res.totalMarks}</td>
                                                    <td className="py-2">
                                                      <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-semibold text-[10px]">
                                                        {res.grade}
                                                      </span>
                                                    </td>
                                                  </tr>
                                                ))}
                                              </tbody>
                                            </table>
                                          </div>
                                        )}
                                      </div>

                                      {/* Right Card: Leaves & Assignments */}
                                      <div className="space-y-6">
                                        {/* Assignments */}
                                        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-4">
                                          <h4 className="text-sm font-bold text-gray-900 border-b border-gray-100 pb-2 flex items-center gap-2">
                                            <FileText className="w-4 h-4 text-purple-600" />
                                            Assignment Activity
                                          </h4>
                                          {item.submissions.length === 0 ? (
                                            <p className="text-xs text-gray-500 py-2">No assignment submissions recorded.</p>
                                          ) : (
                                            <div className="space-y-2 max-h-40 overflow-y-auto">
                                              {item.submissions.map((sub: any, idx: number) => (
                                                <div key={idx} className="flex items-center justify-between text-xs p-2 bg-gray-50 rounded-lg">
                                                  <div>
                                                    <p className="font-semibold text-gray-800">{sub.title}</p>
                                                    <p className="text-[10px] text-gray-500">{sub.course}</p>
                                                  </div>
                                                  <div className="text-right">
                                                    <span className="text-purple-600 font-bold">{sub.marks} pts</span>
                                                    <p className="text-[9px] text-gray-400">
                                                      {new Date(sub.submittedAt).toLocaleDateString()}
                                                    </p>
                                                  </div>
                                                </div>
                                              ))}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </>
                                  ) : (
                                    <>
                                      {/* Teacher Detail: Left Card - Courses Taught */}
                                      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-4">
                                        <h4 className="text-sm font-bold text-gray-900 border-b border-gray-100 pb-2 flex items-center gap-2">
                                          <Building2 className="w-4 h-4 text-blue-600" />
                                          Courses/Subjects Taught
                                        </h4>
                                        {item.courses.length === 0 ? (
                                          <p className="text-xs text-gray-500 py-2">No courses assigned to this teacher.</p>
                                        ) : (
                                          <div className="space-y-2">
                                            {item.courses.map((c: any, idx: number) => (
                                              <div key={idx} className="flex items-center justify-between text-xs p-2 bg-gray-50 rounded-lg">
                                                <div>
                                                  <p className="font-semibold text-gray-900">{c.name}</p>
                                                  <p className="text-[10px] text-gray-500">Code: {c.code}</p>
                                                </div>
                                                <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-semibold text-[10px]">
                                                  Semester {c.semester}
                                                </span>
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                      </div>

                                      {/* Teacher Detail: Right Card - Salaries */}
                                      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-4">
                                        <h4 className="text-sm font-bold text-gray-900 border-b border-gray-100 pb-2 flex items-center gap-2">
                                          <DollarSign className="w-4 h-4 text-emerald-600" />
                                          Compensation & Salary Payouts
                                        </h4>
                                        {item.salaries.length === 0 ? (
                                          <p className="text-xs text-gray-500 py-2">No salary records seeded.</p>
                                        ) : (
                                          <div className="space-y-2">
                                            {item.salaries.map((sal: any, idx: number) => (
                                              <div key={idx} className="flex items-center justify-between text-xs p-2.5 bg-gray-50 rounded-lg">
                                                <div>
                                                  <p className="font-semibold text-gray-800">Payout Base: ${sal.total}</p>
                                                  <p className="text-[10px] text-gray-500">
                                                    Due: {new Date(sal.dueDate).toLocaleDateString()}
                                                  </p>
                                                </div>
                                                <div className="text-right">
                                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                                    sal.status === "Paid"
                                                      ? "bg-emerald-50 text-emerald-700"
                                                      : sal.status === "Partial"
                                                      ? "bg-amber-50 text-amber-700"
                                                      : "bg-red-50 text-red-700"
                                                  }`}>
                                                    {sal.status} (${sal.paid} Paid)
                                                  </span>
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    </>
                                  )}

                                  {/* Bottom Full-Width Section in Expansion: Leaves */}
                                  <div className="md:col-span-2 bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-4">
                                    <h4 className="text-sm font-bold text-gray-900 border-b border-gray-100 pb-2 flex items-center gap-2">
                                      <Calendar className="w-4 h-4 text-amber-600" />
                                      Leave Log & Absence Excuses
                                    </h4>
                                    {item.leaves.length === 0 ? (
                                      <p className="text-xs text-gray-500 py-2">No leave applications on record.</p>
                                    ) : (
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {item.leaves.map((l: any, idx: number) => (
                                          <div key={idx} className="border border-gray-100 rounded-lg p-3 bg-gray-50/50 flex flex-col justify-between gap-1">
                                            <div className="flex items-center justify-between text-xs">
                                              <span className="font-bold text-gray-800">{l.type} Leave</span>
                                              <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                                                l.status === "Approved"
                                                  ? "bg-emerald-50 text-emerald-700"
                                                  : l.status === "Pending"
                                                  ? "bg-amber-50 text-amber-700"
                                                  : "bg-red-50 text-red-700"
                                              }`}>
                                                {l.status}
                                              </span>
                                            </div>
                                            <p className="text-[11px] text-gray-600 italic">"{l.reason}"</p>
                                            <p className="text-[10px] text-gray-400 self-end">
                                              {new Date(l.startDate).toLocaleDateString()} - {new Date(l.endDate).toLocaleDateString()}
                                            </p>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
