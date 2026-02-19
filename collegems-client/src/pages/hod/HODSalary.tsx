import { useEffect, useState } from "react";
import {
  DollarSign,
  Calendar,
  Users,
  Search,
  CheckCircle,
  XCircle,
  AlertCircle,
  CreditCard,
  Download,
  UserPlus,
  Clock,
  TrendingUp,
  Filter,
  ChevronDown,
  User,
  Mail,
  Briefcase,
  Wallet,
  PieChart,
} from "lucide-react";
import api from "../../api/axios";

interface Teacher {
  _id: string;
  name: string;
  email: string;
  department?: string;
  designation?: string;
  joinDate?: string;
}

interface Salary {
  _id: string;
  staff: Teacher;
  total: number;
  paid: number;
  status: string;
  dueDate?: string;
  remaining?: number;
  lastPayment?: string;
}

export default function HODSalary() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [salaries, setSalaries] = useState<Salary[]>([]);
  const [selectedTeachers, setSelectedTeachers] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [total, setTotal] = useState<number | "">("");
  const [dueDate, setDueDate] = useState<string>("");
  const [paymentAmount, setPaymentAmount] = useState<number | "">("");
  const [message, setMessage] = useState<{
    type: "success" | "error" | "info";
    text: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDepartment, setFilterDepartment] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<"set" | "pay" | "history">("set");
  const [selectedPaymentTeacher, setSelectedPaymentTeacher] =
    useState<string>("");
  const [bulkPaymentMode, setBulkPaymentMode] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Fetch teachers
  const fetchTeachers = async () => {
    try {
      setLoading(true);
      const response = await api.get("/users/teachers");
      setTeachers(response.data);
      setMessage(null);
    } catch (error) {
      console.error("Error fetching teachers:", error);
      setMessage({
        type: "error",
        text: "Failed to load teachers data",
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch all salaries
  const fetchSalaries = async () => {
    try {
      const res = await api.get("/salary/all");
      setSalaries(res.data);
    } catch (err: any) {
      console.error("Fetch salaries error:", err.response?.data || err.message);
      setMessage({
        type: "error",
        text: err.response?.data?.message || "Failed to fetch salaries",
      });
    }
  };

  useEffect(() => {
    fetchTeachers();
    fetchSalaries();
  }, []);

  // Filter teachers based on search and department
  const filteredTeachers = teachers.filter((teacher) => {
    const matchesSearch =
      teacher.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      teacher.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDept =
      filterDepartment === "all" || teacher.department === filterDepartment;
    return matchesSearch && matchesDept;
  });

  // Handle select all
  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedTeachers([]);
    } else {
      setSelectedTeachers(filteredTeachers.map((t) => t._id));
    }
    setSelectAll(!selectAll);
  };

  // Handle individual teacher selection
  const handleSelectTeacher = (teacherId: string) => {
    setSelectedTeachers((prev) => {
      if (prev.includes(teacherId)) {
        return prev.filter((id) => id !== teacherId);
      } else {
        return [...prev, teacherId];
      }
    });
    setSelectAll(false);
  };

  // Handle bulk salary setting
  const handleBulkSetSalary = async () => {
    if (selectedTeachers.length === 0) {
      setMessage({
        type: "error",
        text: "Please select at least one teacher",
      });
      return;
    }

    if (!total || !dueDate) {
      setMessage({
        type: "error",
        text: "Total salary and due date are required",
      });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const promises = selectedTeachers.map((teacherId) =>
        api.post("/salary/set", {
          staff: teacherId,
          total: Number(total),
          dueDate,
        }),
      );

      await Promise.all(promises);

      setMessage({
        type: "success",
        text: `Salary set successfully for ${selectedTeachers.length} teacher(s)!`,
      });

      // Refresh salaries
      await fetchSalaries();

      // Reset form
      setSelectedTeachers([]);
      setSelectAll(false);
      setTotal("");
      setDueDate("");
    } catch (err: any) {
      setMessage({
        type: "error",
        text: err.response?.data?.message || "Error setting salary",
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle bulk salary payment
  const handleBulkPaySalary = async () => {
    if (selectedTeachers.length === 0) {
      setMessage({
        type: "error",
        text: "Please select at least one teacher",
      });
      return;
    }

    if (!paymentAmount) {
      setMessage({
        type: "error",
        text: "Payment amount is required",
      });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const promises = selectedTeachers.map((teacherId) =>
        api.post("/salary/pay", {
          staff: teacherId,
          amount: Number(paymentAmount),
        }),
      );

      await Promise.all(promises);

      setMessage({
        type: "success",
        text: `Payment processed successfully for ${selectedTeachers.length} teacher(s)!`,
      });

      // Refresh salaries
      await fetchSalaries();

      // Reset form
      setSelectedTeachers([]);
      setSelectAll(false);
      setPaymentAmount("");
      setBulkPaymentMode(false);
    } catch (err: any) {
      setMessage({
        type: "error",
        text: err.response?.data?.message || "Error processing payment",
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle single teacher payment
  const handleSinglePaySalary = async (teacherId: string) => {
    if (!paymentAmount) {
      setMessage({
        type: "error",
        text: "Payment amount is required",
      });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      await api.post("/salary/pay", {
        staff: teacherId,
        amount: Number(paymentAmount),
      });

      setMessage({
        type: "success",
        text: "Payment processed successfully!",
      });

      // Refresh salaries
      await fetchSalaries();
      setPaymentAmount("");
      setSelectedPaymentTeacher("");
    } catch (err: any) {
      setMessage({
        type: "error",
        text: err.response?.data?.message || "Error processing payment",
      });
    } finally {
      setLoading(false);
    }
  };

  // Calculate statistics
  const totalTeachers = teachers.length;
  const totalSalaryDue = salaries.reduce(
    (sum, s) => sum + (s.total - s.paid),
    0,
  );
  const paidThisMonth = salaries.reduce((sum, s) => {
    if (s.lastPayment) {
      const paymentDate = new Date(s.lastPayment);
      const now = new Date();
      if (
        paymentDate.getMonth() === now.getMonth() &&
        paymentDate.getFullYear() === now.getFullYear()
      ) {
        return sum + s.paid;
      }
    }
    return sum;
  }, 0);

  const pendingPayments = salaries.filter((s) => s.status === "pending").length;

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-50 rounded-lg">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Teachers</p>
              <p className="text-xl font-bold text-gray-900">{totalTeachers}</p>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-gray-100">
            <div className="flex items-center text-xs text-gray-500">
              <User className="w-3 h-3 mr-1" />
              <span>
                {teachers.filter((t) => t.department === "computer").length} in
                CS
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-50 rounded-lg">
              <Wallet className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Salary Due</p>
              <p className="text-xl font-bold text-gray-900">
                ₹{totalSalaryDue.toLocaleString()}
              </p>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-gray-100">
            <div className="flex items-center text-xs text-amber-600">
              <TrendingUp className="w-3 h-3 mr-1" />
              <span>Across {salaries.length} records</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-50 rounded-lg">
              <CreditCard className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Paid This Month</p>
              <p className="text-xl font-bold text-gray-900">
                ₹{paidThisMonth.toLocaleString()}
              </p>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-gray-100">
            <div className="flex items-center text-xs text-emerald-600">
              <CheckCircle className="w-3 h-3 mr-1" />
              <span>Processed successfully</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-50 rounded-lg">
              <Clock className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Pending Payments</p>
              <p className="text-xl font-bold text-gray-900">
                {pendingPayments}
              </p>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-gray-100">
            <div className="flex items-center text-xs text-purple-600">
              <AlertCircle className="w-3 h-3 mr-1" />
              <span>Requires attention</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-gray-200 p-1 inline-flex">
        <button
          onClick={() => setActiveTab("set")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
            activeTab === "set"
              ? "bg-blue-600 text-white"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          <UserPlus className="w-4 h-4" />
          Set Salary
        </button>
        <button
          onClick={() => setActiveTab("pay")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
            activeTab === "pay"
              ? "bg-blue-600 text-white"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          <CreditCard className="w-4 h-4" />
          Pay Salary
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
            activeTab === "history"
              ? "bg-blue-600 text-white"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          <Clock className="w-4 h-4" />
          Payment History
        </button>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Teacher Selection Panel */}
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
                    placeholder="Search teachers by name or email..."
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
                        Department
                      </label>
                      <select
                        value={filterDepartment}
                        onChange={(e) => setFilterDepartment(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="all">All Departments</option>
                        <option value="computer">Computer Science</option>
                        <option value="mathematics">Mathematics</option>
                        <option value="physics">Physics</option>
                        <option value="chemistry">Chemistry</option>
                        <option value="commerce">Commerce</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Salary Status
                      </label>
                      <select className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="all">All Status</option>
                        <option value="paid">Paid</option>
                        <option value="pending">Pending</option>
                        <option value="partial">Partial</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Teacher List Header */}
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center">
              <div className="flex items-center w-8 mr-4">
                <input
                  type="checkbox"
                  checked={selectAll}
                  onChange={handleSelectAll}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              </div>
              <div className="flex-1 font-medium text-gray-700">Teacher</div>
              <div className="w-32 font-medium text-gray-700">Department</div>
              <div className="w-24 font-medium text-gray-700">Status</div>
            </div>

            {/* Teacher List */}
            <div className="max-h-96 overflow-y-auto">
              {loading ? (
                <div className="p-12 text-center">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent"></div>
                  <p className="mt-4 text-gray-500">Loading teachers...</p>
                </div>
              ) : filteredTeachers.length === 0 ? (
                <div className="p-12 text-center">
                  <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No teachers found</p>
                  <p className="text-sm text-gray-400 mt-1">
                    Try adjusting your search or filters
                  </p>
                </div>
              ) : (
                filteredTeachers.map((teacher) => {
                  const teacherSalary = salaries.find(
                    (s) => s.staff?._id === teacher._id,
                  );
                  return (
                    <div
                      key={teacher._id}
                      className={`px-4 py-3 border-b border-gray-100 flex items-center hover:bg-gray-50 transition-colors ${
                        selectedTeachers.includes(teacher._id)
                          ? "bg-blue-50"
                          : ""
                      }`}
                    >
                      <div className="flex items-center w-8 mr-4">
                        <input
                          type="checkbox"
                          checked={selectedTeachers.includes(teacher._id)}
                          onChange={() => handleSelectTeacher(teacher._id)}
                          className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">
                          {teacher.name}
                        </div>
                        <div className="text-sm text-gray-500 flex items-center gap-2">
                          <Mail className="w-3 h-3" />
                          {teacher.email}
                        </div>
                      </div>
                      <div className="w-32">
                        <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-700">
                          <Briefcase className="w-3 h-3 mr-1" />
                          {teacher.department || "Not set"}
                        </span>
                      </div>
                      <div className="w-24">
                        {teacherSalary ? (
                          <span
                            className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${
                              teacherSalary.status === "paid"
                                ? "bg-green-50 text-green-700"
                                : "bg-amber-50 text-amber-700"
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                                teacherSalary.status === "paid"
                                  ? "bg-green-500"
                                  : "bg-amber-500"
                              }`}
                            ></span>
                            {teacherSalary.status}
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-500">
                            Not set
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Selection Summary */}
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">
                  <span className="font-medium text-gray-900">
                    {selectedTeachers.length}
                  </span>{" "}
                  teachers selected
                </span>
                {selectedTeachers.length > 0 && (
                  <button
                    onClick={() => setSelectedTeachers([])}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Clear selection
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Action Panel */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl border border-gray-200 p-6 sticky top-4">
            {activeTab === "set" && (
              <>
                <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
                  <DollarSign className="w-5 h-5 mr-2 text-blue-600" />
                  Set Salary Details
                </h2>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleBulkSetSalary();
                  }}
                  className="space-y-5"
                >
                  {/* Total Salary */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Total Salary Amount *
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

                  {/* Summary */}
                  {selectedTeachers.length > 0 && total && (
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <h3 className="text-sm font-medium text-gray-700 mb-3">
                        Summary
                      </h3>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Teachers:</span>
                          <span className="font-medium text-gray-900">
                            {selectedTeachers.length}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">
                            Salary per teacher:
                          </span>
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
                              Number(total) * selectedTeachers.length
                            ).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={loading || selectedTeachers.length === 0}
                    className="w-full py-2.5 px-4 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                        Processing...
                      </div>
                    ) : (
                      `Set Salary for ${selectedTeachers.length} Teacher${selectedTeachers.length !== 1 ? "s" : ""}`
                    )}
                  </button>
                </form>
              </>
            )}

            {activeTab === "pay" && (
              <>
                <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
                  <CreditCard className="w-5 h-5 mr-2 text-blue-600" />
                  Process Payment
                </h2>

                <div className="space-y-5">
                  {/* Payment Mode Toggle */}
                  <div className="flex space-x-2 bg-gray-100 p-1 rounded-lg">
                    <button
                      onClick={() => setBulkPaymentMode(false)}
                      className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                        !bulkPaymentMode
                          ? "bg-white text-gray-900 shadow-sm"
                          : "text-gray-600 hover:text-gray-900"
                      }`}
                    >
                      Single
                    </button>
                    <button
                      onClick={() => setBulkPaymentMode(true)}
                      className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                        bulkPaymentMode
                          ? "bg-white text-gray-900 shadow-sm"
                          : "text-gray-600 hover:text-gray-900"
                      }`}
                    >
                      Bulk
                    </button>
                  </div>

                  {!bulkPaymentMode ? (
                    // Single Payment
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Select Teacher
                        </label>
                        <select
                          value={selectedPaymentTeacher}
                          onChange={(e) =>
                            setSelectedPaymentTeacher(e.target.value)
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Choose a teacher</option>
                          {teachers.map((teacher) => (
                            <option key={teacher._id} value={teacher._id}>
                              {teacher.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Payment Amount *
                        </label>
                        <div className="relative">
                          <DollarSign
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                            size={18}
                          />
                          <input
                            type="number"
                            placeholder="Enter amount"
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={paymentAmount}
                            onChange={(e) =>
                              setPaymentAmount(Number(e.target.value))
                            }
                          />
                        </div>
                      </div>

                      <button
                        onClick={() =>
                          handleSinglePaySalary(selectedPaymentTeacher)
                        }
                        disabled={
                          loading || !selectedPaymentTeacher || !paymentAmount
                        }
                        className="w-full py-2.5 px-4 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-300"
                      >
                        {loading ? "Processing..." : "Process Payment"}
                      </button>
                    </>
                  ) : (
                    // Bulk Payment
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Payment Amount per Teacher *
                        </label>
                        <div className="relative">
                          <DollarSign
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                            size={18}
                          />
                          <input
                            type="number"
                            placeholder="Enter amount"
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={paymentAmount}
                            onChange={(e) =>
                              setPaymentAmount(Number(e.target.value))
                            }
                          />
                        </div>
                      </div>

                      {selectedTeachers.length > 0 && paymentAmount && (
                        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                          <h3 className="text-sm font-medium text-gray-700 mb-3">
                            Payment Summary
                          </h3>
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">Teachers:</span>
                              <span className="font-medium text-gray-900">
                                {selectedTeachers.length}
                              </span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">
                                Amount per teacher:
                              </span>
                              <span className="font-medium text-gray-900">
                                ₹{paymentAmount}
                              </span>
                            </div>
                            <div className="flex justify-between text-sm pt-2 border-t border-gray-200">
                              <span className="font-medium text-gray-700">
                                Total payment:
                              </span>
                              <span className="font-bold text-blue-600">
                                ₹
                                {(
                                  Number(paymentAmount) *
                                  selectedTeachers.length
                                ).toLocaleString()}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}

                      <button
                        onClick={handleBulkPaySalary}
                        disabled={
                          loading ||
                          selectedTeachers.length === 0 ||
                          !paymentAmount
                        }
                        className="w-full py-2.5 px-4 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-300"
                      >
                        {loading
                          ? "Processing..."
                          : `Pay ${selectedTeachers.length} Teacher${selectedTeachers.length !== 1 ? "s" : ""}`}
                      </button>
                    </>
                  )}
                </div>
              </>
            )}

            {activeTab === "history" && (
              <>
                <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
                  <Clock className="w-5 h-5 mr-2 text-blue-600" />
                  Payment History
                </h2>

                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {salaries.length === 0 ? (
                    <div className="text-center py-8">
                      <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500">No payment history yet</p>
                    </div>
                  ) : (
                    salaries.map((salary) => (
                      <div
                        key={salary._id}
                        className="p-4 bg-gray-50 rounded-lg border border-gray-200"
                      >
                        <div className="font-medium text-gray-900">
                          {salary.staff?.name}
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          Paid: ₹{salary.paid.toLocaleString()} / ₹
                          {salary.total.toLocaleString()}
                        </div>
                        <div className="mt-2">
                          <div className="flex justify-between text-xs text-gray-500 mb-1">
                            <span>Progress</span>
                            <span>
                              {Math.round((salary.paid / salary.total) * 100)}%
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="h-2 rounded-full bg-blue-600"
                              style={{
                                width: `${(salary.paid / salary.total) * 100}%`,
                              }}
                            />
                          </div>
                        </div>
                        <div className="mt-2 text-xs text-gray-500">
                          Last updated:{" "}
                          {salary.lastPayment
                            ? new Date(salary.lastPayment).toLocaleDateString()
                            : "N/A"}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}

            {/* Message Display */}
            {message && (
              <div
                className={`mt-4 p-3 rounded-lg flex items-start gap-2 ${
                  message.type === "success"
                    ? "bg-green-50 text-green-800"
                    : message.type === "error"
                      ? "bg-red-50 text-red-800"
                      : "bg-blue-50 text-blue-800"
                }`}
              >
                {message.type === "success" ? (
                  <CheckCircle size={18} className="shrink-0 mt-0.5" />
                ) : message.type === "error" ? (
                  <XCircle size={18} className="shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle size={18} className="shrink-0 mt-0.5" />
                )}
                <span className="text-sm">{message.text}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Salary Records Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <PieChart className="w-5 h-5 text-blue-600" />
            Salary Records
          </h3>
          <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <Download size={18} className="text-gray-500" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Teacher
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Paid
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Remaining
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Due Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {salaries.map((s) => (
                <tr key={s._id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">
                      {s.staff?.name || "Deleted Staff"}
                    </div>
                    <div className="text-sm text-gray-500">
                      {s.staff?.email}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-900">
                    ₹{s.total.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-gray-900">
                    ₹{s.paid.toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-blue-600 font-medium">
                      ₹{(s.total - s.paid).toLocaleString()}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${
                        s.status === "paid"
                          ? "bg-green-50 text-green-700"
                          : "bg-amber-50 text-amber-700"
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                          s.status === "paid" ? "bg-green-500" : "bg-amber-500"
                        }`}
                      ></span>
                      {s.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {s.dueDate
                      ? new Date(s.dueDate).toLocaleDateString()
                      : "N/A"}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => {
                        setSelectedPaymentTeacher(s.staff._id);
                        setActiveTab("pay");
                      }}
                      className="px-3 py-1 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Pay Now
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
