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
  ArrowUpRight,
  FileText,
  MoreHorizontal,
  ChevronDown,
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
  { id: "bca", name: "BCA", color: "#2563eb" },
  { id: "bba", name: "BBA", color: "#7c3aed" },
  { id: "mba", name: "MBA", color: "#db2777" },
  { id: "bcom", name: "B.Com", color: "#059669" },
  { id: "mcom", name: "M.Com", color: "#dc2626" },
  { id: "bsc", name: "B.Sc", color: "#d97706" },
  { id: "msc", name: "M.Sc", color: "#0891b2" },
];

// Semester options
const semesters = [1, 2, 3, 4, 5, 6, 7, 8];

export default function TeacherFee() {
  const [fees, setFees] = useState<Fee[]>([]);
  const [filteredFees, setFilteredFees] = useState<Fee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

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
    collectionRate: 0,
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
    const collectionRate =
      totalFees > 0 ? (collectedFees / totalFees) * 100 : 0;

    setStats({
      totalFees,
      collectedFees,
      pendingFees,
      overdueFees,
      totalStudents,
      collectionRate,
    });
  }, [fees]);

  // Apply filters
  useEffect(() => {
    let filtered = [...fees];

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

    if (selectedCourse !== "all") {
      filtered = filtered.filter(
        (fee) => fee.student?.course === selectedCourse,
      );
    }

    if (selectedSemester !== "all") {
      filtered = filtered.filter(
        (fee) => fee.student?.semester === parseInt(selectedSemester),
      );
    }

    if (selectedStatus !== "all") {
      filtered = filtered.filter((fee) => fee.status === selectedStatus);
    }

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

  // Get status badge styles
  const getStatusDetails = (status: string) => {
    switch (status) {
      case "paid":
        return {
          bg: "bg-emerald-50",
          text: "text-emerald-700",
          border: "border-emerald-200",
          icon: <CheckCircle size={14} className="text-emerald-600" />,
          label: "Paid",
        };
      case "partial":
        return {
          bg: "bg-amber-50",
          text: "text-amber-700",
          border: "border-amber-200",
          icon: <Clock size={14} className="text-amber-600" />,
          label: "Partial",
        };
      case "pending":
        return {
          bg: "bg-blue-50",
          text: "text-blue-700",
          border: "border-blue-200",
          icon: <Clock size={14} className="text-blue-600" />,
          label: "Pending",
        };
      case "overdue":
        return {
          bg: "bg-red-50",
          text: "text-red-700",
          border: "border-red-200",
          icon: <XCircle size={14} className="text-red-600" />,
          label: "Overdue",
        };
      default:
        return {
          bg: "bg-gray-50",
          text: "text-gray-700",
          border: "border-gray-200",
          icon: null,
          label: status,
        };
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

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
      fee.student?.course?.toUpperCase() || "N/A",
      fee.student?.semester || "N/A",
      fee.total,
      fee.paid,
      fee.total - fee.paid,
      fee.status.toUpperCase(),
      fee.dueDate ? new Date(fee.dueDate).toLocaleDateString("en-IN") : "N/A",
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

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedCourse("all");
    setSelectedSemester("all");
    setSelectedStatus("all");
    setDateRange({ start: "", end: "" });
  };

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">Total Fees</span>
            <div className="p-2 bg-blue-50 rounded-lg">
              <DollarSign className="w-4 h-4 text-blue-600" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {formatCurrency(stats.totalFees)}
          </div>
          <div className="text-xs text-gray-500 mt-1">Across all students</div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">Collected</span>
            <div className="p-2 bg-emerald-50 rounded-lg">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
            </div>
          </div>
          <div className="text-2xl font-bold text-emerald-600">
            {formatCurrency(stats.collectedFees)}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {stats.collectionRate.toFixed(1)}% collection rate
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">Pending</span>
            <div className="p-2 bg-amber-50 rounded-lg">
              <Clock className="w-4 h-4 text-amber-600" />
            </div>
          </div>
          <div className="text-2xl font-bold text-amber-600">
            {formatCurrency(stats.pendingFees)}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {((stats.pendingFees / stats.totalFees) * 100 || 0).toFixed(1)}% of
            total
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">Overdue</span>
            <div className="p-2 bg-red-50 rounded-lg">
              <XCircle className="w-4 h-4 text-red-600" />
            </div>
          </div>
          <div className="text-2xl font-bold text-red-600">
            {stats.overdueFees}
          </div>
          <div className="text-xs text-gray-500 mt-1">Students overdue</div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">Active Students</span>
            <div className="p-2 bg-purple-50 rounded-lg">
              <Users className="w-4 h-4 text-purple-600" />
            </div>
          </div>
          <div className="text-2xl font-bold text-purple-600">
            {stats.totalStudents}
          </div>
          <div className="text-xs text-gray-500 mt-1">Enrolled students</div>
        </div>
      </div>

      {/* Filters Section */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-5 border-b border-gray-200">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center justify-between w-full"
          >
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-gray-500" />
              <span className="font-medium text-gray-700">Filters</span>
            </div>
            <div className="flex items-center gap-4">
              {(searchTerm ||
                selectedCourse !== "all" ||
                selectedSemester !== "all" ||
                selectedStatus !== "all" ||
                dateRange.start ||
                dateRange.end) && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    clearFilters();
                  }}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  Clear all
                </button>
              )}
              <ChevronDown
                className={`w-5 h-5 text-gray-500 transition-transform ${showFilters ? "rotate-180" : ""}`}
              />
            </div>
          </button>
        </div>

        {showFilters && (
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Search */}
              <div className="col-span-1 md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Search
                </label>
                <div className="relative">
                  <Search
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                    size={18}
                  />
                  <input
                    type="text"
                    placeholder="Search by name, email, enrollment..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Course Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Course
                </label>
                <select
                  value={selectedCourse}
                  onChange={(e) => setSelectedCourse(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Semester
                </label>
                <select
                  value={selectedSemester}
                  onChange={(e) => setSelectedSemester(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Status</option>
                  <option value="paid">Paid</option>
                  <option value="partial">Partial</option>
                  <option value="pending">Pending</option>
                  <option value="overdue">Overdue</option>
                </select>
              </div>

              {/* Date Range */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  From Date
                </label>
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) =>
                    setDateRange({ ...dateRange, start: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  To Date
                </label>
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) =>
                    setDateRange({ ...dateRange, end: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Active Filters Tags */}
            {(searchTerm ||
              selectedCourse !== "all" ||
              selectedSemester !== "all" ||
              selectedStatus !== "all" ||
              dateRange.start ||
              dateRange.end) && (
              <div className="flex flex-wrap gap-2 pt-3">
                <span className="text-sm text-gray-500">Active filters:</span>
                {searchTerm && (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs bg-blue-50 text-blue-700 border border-blue-200">
                    Search: {searchTerm}
                  </span>
                )}
                {selectedCourse !== "all" && (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs bg-purple-50 text-purple-700 border border-purple-200">
                    Course: {courses.find((c) => c.id === selectedCourse)?.name}
                  </span>
                )}
                {selectedSemester !== "all" && (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs bg-amber-50 text-amber-700 border border-amber-200">
                    Semester: {selectedSemester}
                  </span>
                )}
                {selectedStatus !== "all" && (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Status: {selectedStatus}
                  </span>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Fee Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Student
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Course
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sem
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Fee
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Paid
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Remaining
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Due Date
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center">
                    <div className="flex justify-center items-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent"></div>
                      <span className="ml-3 text-gray-500">
                        Loading fee data...
                      </span>
                    </div>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td
                    colSpan={9}
                    className="px-4 py-8 text-center text-red-600"
                  >
                    {error}
                  </td>
                </tr>
              ) : filteredFees.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center">
                    <div className="text-gray-400">
                      <DollarSign
                        size={48}
                        className="mx-auto mb-4 opacity-50"
                      />
                      <p className="text-gray-600 font-medium">
                        No fee records found
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        Try adjusting your filters or add new fees
                      </p>
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
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">
                          {fee.student?.name || "Deleted Student"}
                        </div>
                        {fee.student?.email && (
                          <div className="text-xs text-gray-500">
                            {fee.student.email}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {fee.student?.course ? (
                          <span
                            className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium"
                            style={{
                              backgroundColor:
                                courses.find((c) => c.id === fee.student.course)
                                  ?.color + "15",
                              color: courses.find(
                                (c) => c.id === fee.student.course,
                              )?.color,
                            }}
                          >
                            {fee.student.course.toUpperCase()}
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {fee.student?.semester
                          ? `Sem ${fee.student.semester}`
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-gray-900">
                        {formatCurrency(fee.total)}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-emerald-600">
                        {formatCurrency(fee.paid)}
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        <span
                          className={
                            remaining > 0
                              ? "text-amber-600"
                              : "text-emerald-600"
                          }
                        >
                          {formatCurrency(remaining)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-center">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${statusDetails.bg} ${statusDetails.text} ${statusDetails.border}`}
                          >
                            {statusDetails.icon}
                            {statusDetails.label}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {fee.dueDate ? (
                          <div className="text-sm text-gray-600">
                            {new Date(fee.dueDate).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </div>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-center space-x-2">
                          <button
                            className="p-1 hover:bg-gray-100 rounded transition-colors"
                            title="View Details"
                          >
                            <Eye size={16} className="text-gray-500" />
                          </button>
                          <button
                            className="p-1 hover:bg-gray-100 rounded transition-colors"
                            title="Download Receipt"
                          >
                            <FileText size={16} className="text-gray-500" />
                          </button>
                          <button
                            className="p-1 hover:bg-gray-100 rounded transition-colors"
                            title="More Options"
                          >
                            <MoreHorizontal
                              size={16}
                              className="text-gray-500"
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
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex flex-col sm:flex-row justify-between items-center gap-2">
          <div className="text-sm text-gray-600">
            Showing <span className="font-medium">{filteredFees.length}</span>{" "}
            of <span className="font-medium">{fees.length}</span> records
          </div>
          <div className="text-sm text-gray-500">
            Last updated: {new Date().toLocaleString("en-IN")}
          </div>
          <button
            onClick={exportToCSV}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            Export Report
          </button>
        </div>
      </div>

      {/* Course-wise Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {courses.slice(0, 4).map((course) => {
          const courseFees = fees.filter(
            (f) => f.student?.course === course.id,
          );
          const total = courseFees.reduce((sum, f) => sum + f.total, 0);
          const paid = courseFees.reduce((sum, f) => sum + f.paid, 0);
          const pending = total - paid;
          const collectionRate = total > 0 ? (paid / total) * 100 : 0;

          return (
            <div
              key={course.id}
              className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: course.color }}
                  />
                  <span className="font-medium text-gray-900">
                    {course.name}
                  </span>
                </div>
                <GraduationCap size={16} style={{ color: course.color }} />
              </div>
              <div className="flex items-baseline justify-between mb-1">
                <span className="text-2xl font-bold text-gray-900">
                  {formatCurrency(pending)}
                </span>
                <span className="text-sm text-gray-500">
                  {courseFees.length} students
                </span>
              </div>
              <div className="flex items-center justify-between text-sm mb-3">
                <span className="text-gray-500">
                  Pending of {formatCurrency(total)}
                </span>
                <span
                  className={
                    collectionRate > 70 ? "text-emerald-600" : "text-amber-600"
                  }
                >
                  {collectionRate.toFixed(0)}% collected
                </span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${collectionRate}%`,
                    backgroundColor: course.color,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent Payments */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">Recent Payments</h3>
          <button className="text-sm text-blue-600 hover:text-blue-700">
            View all
          </button>
        </div>
        <div className="space-y-3">
          {fees
            .filter((f) => f.paymentHistory?.length)
            .slice(0, 3)
            .map((fee, index) => (
              <div
                key={index}
                className="flex items-center gap-4 py-3 border-b border-gray-100 last:border-0"
              >
                <div className="p-2 bg-blue-50 rounded-lg">
                  <ArrowUpRight className="w-4 h-4 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">
                    {fee.student?.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {fee.paymentHistory?.[0]?.date
                      ? new Date(fee.paymentHistory[0].date).toLocaleDateString(
                          "en-IN",
                        )
                      : "Today"}{" "}
                    • {fee.paymentHistory?.[0]?.method || "Online"}
                  </p>
                </div>
                <span className="text-sm font-medium text-emerald-600">
                  {formatCurrency(fee.paymentHistory?.[0]?.amount || 0)}
                </span>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
