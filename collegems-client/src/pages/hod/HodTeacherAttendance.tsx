import { useState, useEffect } from "react";
import {
  Calendar,
  Users,
  CheckCircle,
  XCircle,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Download,
  BarChart3,
  PieChart,
  TrendingUp,
  CalendarDays,
  UserCheck,
  UserX,
  UserMinus,
  Filter,
  RefreshCw,
} from "lucide-react";
import api from "../../api/axios";

interface TeacherAttendance {
  _id: string;
  teacher: {
    _id: string;
    name: string;
    email: string;
    department: string;
  };
  status: "Present" | "Absent" | "Late";
  date: string;
  markedBy: {
    name: string;
    role: string;
  };
  markedAt: string;
}

interface AttendanceStats {
  present: number;
  absent: number;
  late: number;
  totalTeachers: number;
  departmentWise: Record<
    string,
    {
      present: number;
      absent: number;
      late: number;
      total: number;
    }
  >;
}

export default function HODTeacherAttendance() {
  const [attendanceData, setAttendanceData] = useState<TeacherAttendance[]>([]);
  const [stats, setStats] = useState<AttendanceStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);
  const [selectedView, setSelectedView] = useState<
    "daily" | "weekly" | "monthly"
  >("daily");
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setDate(1)).toISOString().split("T")[0],
    end: new Date().toISOString().split("T")[0],
  });
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all");
  const [departments, setDepartments] = useState<string[]>([]);

  useEffect(() => {
    fetchAttendanceData();
    fetchStats();
  }, [selectedView, selectedDate, dateRange]);

  useEffect(() => {
    // Extract unique departments from attendance data
    const uniqueDepts = [
      ...new Set(
        attendanceData.map((a) => a.teacher.department).filter(Boolean),
      ),
    ];
    setDepartments(uniqueDepts);
  }, [attendanceData]);

  const fetchAttendanceData = async () => {
    try {
      setLoading(true);
      let url = "/teacher-attendance/all?";

      if (selectedView === "daily") {
        url += `date=${selectedDate}`;
      } else if (selectedView === "weekly") {
        url += `startDate=${dateRange.start}&endDate=${dateRange.end}`;
      } else if (selectedView === "monthly") {
        const [year, month] = selectedDate.split("-");
        url += `year=${year}&month=${month}`;
      }

      const res = await api.get(url);
      setAttendanceData(res.data);
    } catch (err) {
      console.error("Failed to fetch attendance data", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      setStatsLoading(true);
      let url = "/teacher-attendance/stats?";

      if (selectedView === "daily") {
        url += `startDate=${selectedDate}&endDate=${selectedDate}`;
      } else if (selectedView === "weekly") {
        url += `startDate=${dateRange.start}&endDate=${dateRange.end}`;
      } else if (selectedView === "monthly") {
        const [year, month] = selectedDate.split("-");
        const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
        const endDate = new Date(parseInt(year), parseInt(month), 0);
        url += `startDate=${startDate.toISOString().split("T")[0]}&endDate=${endDate.toISOString().split("T")[0]}`;
      }

      const res = await api.get(url);
      setStats(res.data);
    } catch (err) {
      console.error("Failed to fetch stats", err);
    } finally {
      setStatsLoading(false);
    }
  };

  const handlePrevious = () => {
    if (selectedView === "daily") {
      const prevDate = new Date(selectedDate);
      prevDate.setDate(prevDate.getDate() - 1);
      setSelectedDate(prevDate.toISOString().split("T")[0]);
    } else if (selectedView === "weekly") {
      const start = new Date(dateRange.start);
      const end = new Date(dateRange.end);
      start.setDate(start.getDate() - 7);
      end.setDate(end.getDate() - 7);
      setDateRange({
        start: start.toISOString().split("T")[0],
        end: end.toISOString().split("T")[0],
      });
    } else if (selectedView === "monthly") {
      const [year, month] = selectedDate.split("-");
      const prevMonth = new Date(parseInt(year), parseInt(month) - 2, 1);
      setSelectedDate(prevMonth.toISOString().split("T")[0]);
    }
  };

  const handleNext = () => {
    if (selectedView === "daily") {
      const nextDate = new Date(selectedDate);
      nextDate.setDate(nextDate.getDate() + 1);
      setSelectedDate(nextDate.toISOString().split("T")[0]);
    } else if (selectedView === "weekly") {
      const start = new Date(dateRange.start);
      const end = new Date(dateRange.end);
      start.setDate(start.getDate() + 7);
      end.setDate(end.getDate() + 7);
      setDateRange({
        start: start.toISOString().split("T")[0],
        end: end.toISOString().split("T")[0],
      });
    } else if (selectedView === "monthly") {
      const [year, month] = selectedDate.split("-");
      const nextMonth = new Date(parseInt(year), parseInt(month), 1);
      setSelectedDate(nextMonth.toISOString().split("T")[0]);
    }
  };

  const exportToCSV = () => {
    const headers = [
      "Teacher Name",
      "Department",
      "Email",
      "Status",
      "Date",
      "Marked By",
      "Marked At",
    ];
    const filteredData =
      selectedDepartment === "all"
        ? attendanceData
        : attendanceData.filter(
            (a) => a.teacher.department === selectedDepartment,
          );

    const csvData = filteredData.map((record) => [
      record.teacher.name,
      record.teacher.department || "N/A",
      record.teacher.email,
      record.status,
      new Date(record.date).toLocaleDateString(),
      record.markedBy?.name || "N/A",
      new Date(record.markedAt).toLocaleString(),
    ]);

    const csvContent = [headers, ...csvData]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `teacher-attendance-${selectedDate}.csv`;
    a.click();
  };

  const filteredAttendance =
    selectedDepartment === "all"
      ? attendanceData
      : attendanceData.filter(
          (a) => a.teacher.department === selectedDepartment,
        );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"></div>

      {/* Controls */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-lg">
              {["daily", "weekly", "monthly"].map((view) => (
                <button
                  key={view}
                  onClick={() => setSelectedView(view as any)}
                  className={`
                    px-3 py-1.5 text-sm font-medium rounded-lg transition-colors
                    ${
                      selectedView === view
                        ? "bg-white text-blue-600 shadow-sm"
                        : "text-gray-600 hover:bg-gray-200"
                    }
                  `}
                >
                  {view.charAt(0).toUpperCase() + view.slice(1)}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handlePrevious}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-4 h-4 text-gray-600" />
              </button>

              {selectedView === "daily" && (
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              )}

              {selectedView === "weekly" && (
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={dateRange.start}
                    onChange={(e) =>
                      setDateRange((prev) => ({
                        ...prev,
                        start: e.target.value,
                      }))
                    }
                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-gray-400">to</span>
                  <input
                    type="date"
                    value={dateRange.end}
                    onChange={(e) =>
                      setDateRange((prev) => ({ ...prev, end: e.target.value }))
                    }
                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              {selectedView === "monthly" && (
                <input
                  type="month"
                  value={selectedDate.slice(0, 7)}
                  onChange={(e) => setSelectedDate(e.target.value + "-01")}
                  className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              )}

              <button
                onClick={handleNext}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronRight className="w-4 h-4 text-gray-600" />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Departments</option>
              {departments.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
            <div className="flex items-center gap-2">
              <button
                onClick={exportToCSV}
                className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Export Report
              </button>
              <button
                onClick={fetchAttendanceData}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Refresh"
              >
                <RefreshCw className="w-4 h-4 text-gray-600" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      {stats && !statsLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-500">Total Teachers</p>
              <Users className="w-4 h-4 text-gray-400" />
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {stats.totalTeachers}
            </p>
          </div>

          <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-emerald-600">Present</p>
              <UserCheck className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="text-2xl font-bold text-emerald-700">
              {stats.present}
            </p>
          </div>

          <div className="bg-amber-50 rounded-xl border border-amber-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-amber-600">Late</p>
              <UserMinus className="w-4 h-4 text-amber-600" />
            </div>
            <p className="text-2xl font-bold text-amber-700">{stats.late}</p>
          </div>

          <div className="bg-rose-50 rounded-xl border border-rose-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-rose-600">Absent</p>
              <UserX className="w-4 h-4 text-rose-600" />
            </div>
            <p className="text-2xl font-bold text-rose-700">{stats.absent}</p>
          </div>

          <div className="bg-blue-50 rounded-xl border border-blue-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-blue-600">Attendance Rate</p>
              <TrendingUp className="w-4 h-4 text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-blue-700">
              {stats.totalTeachers > 0
                ? Math.round((stats.present / stats.totalTeachers) * 100)
                : 0}
              %
            </p>
          </div>
        </div>
      )}

      {/* Department-wise Stats */}
      {stats && Object.keys(stats.departmentWise).length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-gray-500" />
            Department-wise Attendance
          </h3>
          <div className="space-y-4">
            {Object.entries(stats.departmentWise).map(([dept, data]) => (
              <div key={dept}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-medium text-gray-700">
                    {dept}
                  </span>
                  <span className="text-xs text-gray-500">
                    {data.present}/{data.total} (
                    {Math.round((data.present / data.total) * 100)}%)
                  </span>
                </div>
                <div className="flex gap-1 h-2">
                  <div
                    className="bg-emerald-500 h-2 rounded-l-full transition-all"
                    style={{ width: `${(data.present / data.total) * 100}%` }}
                    title={`Present: ${data.present}`}
                  />
                  <div
                    className="bg-amber-500 h-2 transition-all"
                    style={{ width: `${(data.late / data.total) * 100}%` }}
                    title={`Late: ${data.late}`}
                  />
                  <div
                    className="bg-rose-500 h-2 rounded-r-full transition-all"
                    style={{ width: `${(data.absent / data.total) * 100}%` }}
                    title={`Absent: ${data.absent}`}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Detailed Records */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900">Attendance Records</h3>
          <p className="text-sm text-gray-500 mt-1">
            Showing {filteredAttendance.length} records
            {selectedDepartment !== "all" &&
              ` for ${selectedDepartment} department`}
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left py-3 px-6 text-xs font-medium text-gray-500 uppercase">
                  Teacher
                </th>
                <th className="text-left py-3 px-6 text-xs font-medium text-gray-500 uppercase">
                  Department
                </th>
                <th className="text-left py-3 px-6 text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="text-left py-3 px-6 text-xs font-medium text-gray-500 uppercase">
                  Date
                </th>
                <th className="text-left py-3 px-6 text-xs font-medium text-gray-500 uppercase">
                  Marked By
                </th>
                <th className="text-left py-3 px-6 text-xs font-medium text-gray-500 uppercase">
                  Marked At
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-12">
                    <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-blue-600 border-t-transparent"></div>
                    <p className="text-sm text-gray-500 mt-2">
                      Loading attendance data...
                    </p>
                  </td>
                </tr>
              ) : filteredAttendance.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12">
                    <CalendarDays className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No attendance records found</p>
                  </td>
                </tr>
              ) : (
                filteredAttendance.map((record) => (
                  <tr
                    key={record._id}
                    className="border-b border-gray-100 hover:bg-gray-50"
                  >
                    <td className="py-3 px-6">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                          <span className="text-sm font-medium text-blue-700">
                            {record.teacher.name.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {record.teacher.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {record.teacher.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-6 text-sm text-gray-600">
                      {record.teacher.department || "N/A"}
                    </td>
                    <td className="py-3 px-6">
                      <span
                        className={`
                          inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium
                          ${record.status === "Present" ? "bg-emerald-50 text-emerald-700" : ""}
                          ${record.status === "Absent" ? "bg-rose-50 text-rose-700" : ""}
                          ${record.status === "Late" ? "bg-amber-50 text-amber-700" : ""}
                        `}
                      >
                        {record.status === "Present" && (
                          <CheckCircle className="w-3 h-3" />
                        )}
                        {record.status === "Absent" && (
                          <XCircle className="w-3 h-3" />
                        )}
                        {record.status === "Late" && (
                          <AlertCircle className="w-3 h-3" />
                        )}
                        {record.status}
                      </span>
                    </td>
                    <td className="py-3 px-6 text-sm text-gray-600">
                      {new Date(record.date).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-6 text-sm text-gray-600">
                      {record.markedBy?.name || "N/A"}
                    </td>
                    <td className="py-3 px-6 text-sm text-gray-500">
                      {new Date(record.markedAt).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
