import { useEffect, useState } from "react";
import api from "../../api/axios";
import {
  Search,
  Filter,
  Download,
  Eye,
  GraduationCap,
  Users,
  DollarSign,
  TrendingUp,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
} from "lucide-react";

interface Student {
  _id: string;
  name: string;
  email?: string;
  course?: string;
  semester?: number;
  enrollmentNo?: string;
}

interface Fee {
  _id: string;
  student: Student;
  total: number;
  paid: number;
  dueDate?: string;
  status: "paid" | "partial" | "pending" | "overdue";
  paymentHistory?: Array<{
    amount: number;
    date: string;
    method: string;
  }>;
}

// Course options for filter
const courses = [
  { id: "bca", name: "BCA", color: "#bd2323" },
  { id: "bba", name: "BBA", color: "#0a295e" },
  { id: "mba", name: "MBA", color: "#e6c235" },
  { id: "bcom", name: "B.Com", color: "#000000" },
  { id: "mcom", name: "M.Com", color: "#bd2323" },
  { id: "bsc", name: "B.Sc", color: "#0a295e" },
  { id: "msc", name: "M.Sc", color: "#e6c235" },
];

// Semester options
const semesters = [1, 2, 3, 4, 5, 6, 7, 8];

export default function TeacherFee() {
  const [fees, setFees] = useState<Fee[]>([]);
  const [filteredFees, setFilteredFees] = useState<Fee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCourse, setSelectedCourse] = useState<string>("all");
  const [selectedSemester, setSelectedSemester] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: "",
    end: "",
  });

  // Statistics
  const [stats, setStats] = useState({
    totalFees: 0,
    collectedFees: 0,
    pendingFees: 0,
    overdueFees: 0,
    totalStudents: 0,
  });

  const fetchAllFees = async () => {
    try {
      setLoading(true);
      const res = await api.get("/fee/all");
      setFees(res.data);
      setError(null);
    } catch (err) {
      console.error(err);
      setError("Failed to load fee data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // fetch
  useEffect(() => {
    fetchAllFees();
  }, []);
  // Calculate statistics
  useEffect(() => {
    const totalFees = fees.reduce((sum, fee) => sum + fee.total, 0);
    const collectedFees = fees.reduce((sum, fee) => sum + fee.paid, 0);
    const pendingFees = fees.reduce(
      (sum, fee) => sum + (fee.total - fee.paid),
      0,
    );
    const overdueFees = fees.filter((f) => f.status === "overdue").length;
    const totalStudents = new Set(fees.map((f) => f.student?._id)).size;

    setStats({
      totalFees,
      collectedFees,
      pendingFees,
      overdueFees,
      totalStudents,
    });
  }, [fees]);

  // Apply filters
  useEffect(() => {
    let filtered = [...fees];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (fee) =>
          fee.student?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          fee.student?.email
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          fee.student?.enrollmentNo
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase()),
      );
    }

    // Course filter
    if (selectedCourse !== "all") {
      filtered = filtered.filter(
        (fee) => fee.student?.course === selectedCourse,
      );
    }

    // Semester filter
    if (selectedSemester !== "all") {
      filtered = filtered.filter(
        (fee) => fee.student?.semester === parseInt(selectedSemester),
      );
    }

    // Status filter
    if (selectedStatus !== "all") {
      filtered = filtered.filter((fee) => fee.status === selectedStatus);
    }

    // Date range filter
    if (dateRange.start) {
      filtered = filtered.filter(
        (fee) =>
          fee.dueDate && new Date(fee.dueDate) >= new Date(dateRange.start),
      );
    }
    if (dateRange.end) {
      filtered = filtered.filter(
        (fee) =>
          fee.dueDate && new Date(fee.dueDate) <= new Date(dateRange.end),
      );
    }

    setFilteredFees(filtered);
  }, [
    fees,
    searchTerm,
    selectedCourse,
    selectedSemester,
    selectedStatus,
    dateRange,
  ]);

  // Get status badge color and icon
  const getStatusDetails = (status: string) => {
    switch (status) {
      case "paid":
        return {
          color: "bg-green-900/30 text-green-400 border-green-800",
          icon: <CheckCircle size={14} className="mr-1" />,
          label: "Paid",
        };
      case "partial":
        return {
          color: "bg-yellow-900/30 text-yellow-400 border-yellow-800",
          icon: <Clock size={14} className="mr-1" />,
          label: "Partial",
        };
      case "pending":
        return {
          color: "bg-blue-900/30 text-blue-400 border-blue-800",
          icon: <Clock size={14} className="mr-1" />,
          label: "Pending",
        };
      case "overdue":
        return {
          color: "bg-red-900/30 text-red-400 border-red-800",
          icon: <XCircle size={14} className="mr-1" />,
          label: "Overdue",
        };
      default:
        return {
          color: "bg-gray-900/30 text-gray-400 border-gray-800",
          icon: null,
          label: status,
        };
    }
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Export to CSV
  const exportToCSV = () => {
    const headers = [
      "Student Name",
      "Course",
      "Semester",
      "Total Fee",
      "Paid",
      "Remaining",
      "Status",
      "Due Date",
    ];
    const data = filteredFees.map((fee) => [
      fee.student?.name || "N/A",
      fee.student?.course || "N/A",
      fee.student?.semester || "N/A",
      fee.total,
      fee.paid,
      fee.total - fee.paid,
      fee.status,
      fee.dueDate ? new Date(fee.dueDate).toLocaleDateString() : "N/A",
    ]);

    const csvContent = [headers, ...data]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fee-report-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  // Clear all filters
  const clearFilters = () => {
    setSearchTerm("");
    setSelectedCourse("all");
    setSelectedSemester("all");
    setSelectedStatus("all");
    setDateRange({ start: "", end: "" });
  };

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div
            className="bg-linear-to-r from-[#0a295e] to-[#bd2323] p-6 rounded-2xl"
            style={{ borderBottom: `3px solid #e6c235` }}
          >
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-white flex items-center">
                  <DollarSign className="mr-3" size={32} />
                  Fee Management
                </h1>
                <p className="text-gray-200 mt-2">
                  View and manage student fees across courses and semesters
                </p>
              </div>
              <button
                onClick={fetchAllFees}
                className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
                title="Refresh data"
              >
                <RefreshCw size={20} className="text-white" />
              </button>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6 mt-10">
          <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <div className="text-gray-400 text-sm">Total Fees</div>
              <DollarSign size={18} style={{ color: "#e6c235" }} />
            </div>
            <div className="text-2xl font-bold text-white">
              {formatCurrency(stats.totalFees)}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Across all students
            </div>
          </div>

          <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <div className="text-gray-400 text-sm">Collected</div>
              <TrendingUp size={18} style={{ color: "#22c55e" }} />
            </div>
            <div className="text-2xl font-bold text-green-400">
              {formatCurrency(stats.collectedFees)}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {((stats.collectedFees / stats.totalFees) * 100 || 0).toFixed(1)}%
              of total
            </div>
          </div>

          <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <div className="text-gray-400 text-sm">Pending</div>
              <Clock size={18} style={{ color: "#eab308" }} />
            </div>
            <div className="text-2xl font-bold text-yellow-400">
              {formatCurrency(stats.pendingFees)}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {((stats.pendingFees / stats.totalFees) * 100 || 0).toFixed(1)}%
              of total
            </div>
          </div>

          <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <div className="text-gray-400 text-sm">Overdue</div>
              <XCircle size={18} style={{ color: "#ef4444" }} />
            </div>
            <div className="text-2xl font-bold text-red-400">
              {stats.overdueFees}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Students with overdue fees
            </div>
          </div>

          <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <div className="text-gray-400 text-sm">Students</div>
              <Users size={18} style={{ color: "#3b82f6" }} />
            </div>
            <div className="text-2xl font-bold text-blue-400">
              {stats.totalStudents}
            </div>
            <div className="text-xs text-gray-500 mt-1">Active students</div>
          </div>
        </div>

        {/* Filters Section */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white flex items-center">
              <Filter className="mr-2" size={20} style={{ color: "#e6c235" }} />
              Filters
            </h2>
            <button
              onClick={clearFilters}
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              Clear all filters
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Search */}
            <div className="col-span-1 md:col-span-2">
              <label className="block text-gray-400 text-sm mb-1">Search</label>
              <div className="relative">
                <Search
                  className="absolute left-3 top-2.5 text-gray-400"
                  size={18}
                />
                <input
                  type="text"
                  placeholder="Search by name, email, enrollment..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-[#bd2323]"
                />
              </div>
            </div>

            {/* Course Filter */}
            <div>
              <label className="block text-gray-400 text-sm mb-1">Course</label>
              <select
                value={selectedCourse}
                onChange={(e) => setSelectedCourse(e.target.value)}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-[#bd2323]"
              >
                <option value="all">All Courses</option>
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Semester Filter */}
            <div>
              <label className="block text-gray-400 text-sm mb-1">
                Semester
              </label>
              <select
                value={selectedSemester}
                onChange={(e) => setSelectedSemester(e.target.value)}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-[#bd2323]"
              >
                <option value="all">All Semesters</option>
                {semesters.map((sem) => (
                  <option key={sem} value={sem}>
                    Semester {sem}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-gray-400 text-sm mb-1">Status</label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-[#bd2323]"
              >
                <option value="all">All Status</option>
                <option value="paid">Paid</option>
                <option value="partial">Partial</option>
                <option value="pending">Pending</option>
                <option value="overdue">Overdue</option>
              </select>
            </div>

            {/* Date Range - Start */}
            <div>
              <label className="block text-gray-400 text-sm mb-1">
                Due Date From
              </label>
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) =>
                  setDateRange({ ...dateRange, start: e.target.value })
                }
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-[#bd2323]"
              />
            </div>

            {/* Date Range - End */}
            <div>
              <label className="block text-gray-400 text-sm mb-1">
                Due Date To
              </label>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) =>
                  setDateRange({ ...dateRange, end: e.target.value })
                }
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-[#bd2323]"
              />
            </div>
          </div>

          {/* Active Filters */}
          {(searchTerm ||
            selectedCourse !== "all" ||
            selectedSemester !== "all" ||
            selectedStatus !== "all" ||
            dateRange.start ||
            dateRange.end) && (
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="text-sm text-gray-400 mr-2">
                Active filters:
              </span>
              {searchTerm && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs bg-[#bd2323] bg-opacity-20 text-[#ff6b6b] border border-[#bd2323]">
                  Search: {searchTerm}
                </span>
              )}
              {selectedCourse !== "all" && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs bg-[#0a295e] bg-opacity-20 text-blue-400 border border-[#0a295e]">
                  Course: {courses.find((c) => c.id === selectedCourse)?.name}
                </span>
              )}
              {selectedSemester !== "all" && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs bg-[#e6c235] bg-opacity-20 text-yellow-400 border border-[#e6c235]">
                  Semester: {selectedSemester}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Export Button */}
        <div className="flex justify-end mb-4">
          <button
            onClick={exportToCSV}
            className="flex items-center px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-300 hover:bg-gray-700 transition-colors"
          >
            <Download size={18} className="mr-2" />
            Export Report
          </button>
        </div>

        {/* Fee Table */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-750 border-b border-gray-700">
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">
                    Student
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">
                    Course
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">
                    Semester
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-400">
                    Total Fee
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-400">
                    Paid
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-400">
                    Remaining
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-400">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">
                    Due Date
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-400">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center">
                      <div className="flex justify-center items-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#bd2323]"></div>
                        <span className="ml-3 text-gray-400">
                          Loading fee data...
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td
                      colSpan={9}
                      className="px-4 py-8 text-center text-red-400"
                    >
                      {error}
                    </td>
                  </tr>
                ) : filteredFees.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center">
                      <div className="text-gray-400">
                        <DollarSign
                          size={48}
                          className="mx-auto mb-4 opacity-50"
                        />
                        No fee records found
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredFees.map((fee) => {
                    const statusDetails = getStatusDetails(fee.status);
                    const remaining = fee.total - fee.paid;

                    return (
                      <tr
                        key={fee._id}
                        className="hover:bg-gray-750 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <div className="font-medium text-white">
                            {fee.student?.name || "Deleted Student"}
                          </div>
                          {fee.student?.email && (
                            <div className="text-xs text-gray-400">
                              {fee.student.email}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {fee.student?.course ? (
                            <span
                              className="px-2 py-1 text-xs rounded-full"
                              style={{
                                backgroundColor:
                                  courses.find(
                                    (c) => c.id === fee.student.course,
                                  )?.color + "20" || "#374151",
                                color:
                                  courses.find(
                                    (c) => c.id === fee.student.course,
                                  )?.color || "#9CA3AF",
                                border: `1px solid ${courses.find((c) => c.id === fee.student.course)?.color || "#374151"}`,
                              }}
                            >
                              {fee.student.course.toUpperCase()}
                            </span>
                          ) : (
                            <span className="text-gray-500">Not set</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {fee.student?.semester ? (
                            <span className="text-gray-300">
                              Sem {fee.student.semester}
                            </span>
                          ) : (
                            <span className="text-gray-500">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-white">
                          {formatCurrency(fee.total)}
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-green-400">
                          {formatCurrency(fee.paid)}
                        </td>
                        <td className="px-4 py-3 text-right font-medium">
                          <span
                            className={
                              remaining > 0
                                ? "text-yellow-400"
                                : "text-green-400"
                            }
                          >
                            {formatCurrency(remaining)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div
                            className={`flex items-center justify-center px-2 py-1 text-xs rounded-full border ${statusDetails.color}`}
                          >
                            {statusDetails.icon}
                            {statusDetails.label}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {fee.dueDate ? (
                            <div className="text-sm text-gray-300">
                              {new Date(fee.dueDate).toLocaleDateString(
                                "en-IN",
                                {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                },
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-500">No due date</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-center space-x-2">
                            <button
                              className="p-1 hover:bg-gray-700 rounded transition-colors"
                              title="View Details"
                            >
                              <Eye
                                size={18}
                                className="text-gray-400 hover:text-white"
                              />
                            </button>
                            <button
                              className="p-1 hover:bg-gray-700 rounded transition-colors"
                              title="Download Receipt"
                            >
                              <Download
                                size={18}
                                className="text-gray-400 hover:text-white"
                              />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Table Footer */}
          <div className="px-4 py-3 bg-gray-750 border-t border-gray-700 flex justify-between items-center">
            <div className="text-sm text-gray-400">
              Showing {filteredFees.length} of {fees.length} records
            </div>
            <div className="text-sm text-gray-400">
              Last updated: {new Date().toLocaleString()}
            </div>
          </div>
        </div>

        {/* Course-wise Summary */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {courses.slice(0, 4).map((course) => {
            const courseFees = fees.filter(
              (f) => f.student?.course === course.id,
            );
            const total = courseFees.reduce((sum, f) => sum + f.total, 0);
            const paid = courseFees.reduce((sum, f) => sum + f.paid, 0);
            const pending = total - paid;

            return (
              <div
                key={course.id}
                className="bg-gray-800 p-4 rounded-xl border border-gray-700"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium" style={{ color: course.color }}>
                    {course.name}
                  </span>
                  <GraduationCap size={18} style={{ color: course.color }} />
                </div>
                <div className="text-lg font-bold text-white">
                  {formatCurrency(pending)}
                </div>
                <div className="text-xs text-gray-400">
                  Pending out of {formatCurrency(total)} • {courseFees.length}{" "}
                  students
                </div>
                <div className="mt-2 h-1 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${(paid / total) * 100 || 0}%`,
                      backgroundColor: course.color,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
