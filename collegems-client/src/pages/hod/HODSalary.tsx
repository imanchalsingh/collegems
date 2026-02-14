import { useEffect, useState } from "react";
import api from "../../api/axios";
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
} from "lucide-react";

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

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div
            className="bg-gray-800 p-4 rounded-xl border-l-4"
            style={{ borderLeftColor: "#bd2323" }}
          >
            <div className="text-gray-400 text-sm mb-1">Total Teachers</div>
            <div className="text-2xl font-bold text-white">{totalTeachers}</div>
          </div>
          <div
            className="bg-gray-800 p-4 rounded-xl border-l-4"
            style={{ borderLeftColor: "#0a295e" }}
          >
            <div className="text-gray-400 text-sm mb-1">Total Salary Due</div>
            <div className="text-2xl font-bold text-white">
              ₹{totalSalaryDue.toLocaleString()}
            </div>
          </div>
          <div
            className="bg-gray-800 p-4 rounded-xl border-l-4"
            style={{ borderLeftColor: "#e6c235" }}
          >
            <div className="text-gray-400 text-sm mb-1">Paid This Month</div>
            <div className="text-2xl font-bold text-white">
              ₹{paidThisMonth.toLocaleString()}
            </div>
          </div>
          <div
            className="bg-gray-800 p-4 rounded-xl border-l-4"
            style={{ borderLeftColor: "#000000" }}
          >
            <div className="text-gray-400 text-sm mb-1">Pending Payments</div>
            <div className="text-2xl font-bold text-white">
              {salaries.filter((s) => s.status === "pending").length}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex space-x-4 mb-6">
          <button
            onClick={() => setActiveTab("set")}
            className={`px-6 py-3 rounded-lg font-medium transition-all flex items-center ${
              activeTab === "set"
                ? "bg-[#bd2323] text-white shadow-lg"
                : "bg-gray-800 text-gray-400 hover:bg-gray-700"
            }`}
          >
            <UserPlus className="mr-2" size={18} />
            Set Salary
          </button>
          <button
            onClick={() => setActiveTab("pay")}
            className={`px-6 py-3 rounded-lg font-medium transition-all flex items-center ${
              activeTab === "pay"
                ? "bg-[#0a295e] text-white shadow-lg"
                : "bg-gray-800 text-gray-400 hover:bg-gray-700"
            }`}
          >
            <CreditCard className="mr-2" size={18} />
            Pay Salary
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`px-6 py-3 rounded-lg font-medium transition-all flex items-center ${
              activeTab === "history"
                ? "bg-[#e6c235] text-black shadow-lg"
                : "bg-gray-800 text-gray-400 hover:bg-gray-700"
            }`}
          >
            <Clock className="mr-2" size={18} />
            Payment History
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Teacher Selection Panel */}
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
                      placeholder="Search teachers..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-[#bd2323]"
                    />
                  </div>
                  <select
                    value={filterDepartment}
                    onChange={(e) => setFilterDepartment(e.target.value)}
                    className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-[#bd2323]"
                  >
                    <option value="all">All Departments</option>
                    <option value="computer">Computer Science</option>
                    <option value="mathematics">Mathematics</option>
                    <option value="physics">Physics</option>
                    <option value="chemistry">Chemistry</option>
                    <option value="commerce">Commerce</option>
                  </select>
                </div>
              </div>

              {/* Teacher List Header */}
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
                  Teacher Name
                </div>
                <div className="w-32 font-medium text-gray-300">Department</div>
                <div className="w-24 font-medium text-gray-300">Status</div>
              </div>

              {/* Teacher List */}
              <div className="max-h-96 overflow-y-auto">
                {loading ? (
                  <div className="p-8 text-center text-gray-400">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#bd2323] mx-auto mb-4"></div>
                    Loading teachers...
                  </div>
                ) : filteredTeachers.length === 0 ? (
                  <div className="p-8 text-center text-gray-400">
                    <Users size={48} className="mx-auto mb-4 opacity-50" />
                    No teachers found
                  </div>
                ) : (
                  filteredTeachers.map((teacher) => {
                    const teacherSalary = salaries.find(
                      (s) => s.staff?._id === teacher._id,
                    );
                    return (
                      <div
                        key={teacher._id}
                        className={`px-4 py-3 border-b border-gray-700 flex items-center hover:bg-gray-750 transition-colors ${
                          selectedTeachers.includes(teacher._id)
                            ? "bg-gray-750"
                            : ""
                        }`}
                      >
                        <div className="flex items-center w-8 mr-4">
                          <input
                            type="checkbox"
                            checked={selectedTeachers.includes(teacher._id)}
                            onChange={() => handleSelectTeacher(teacher._id)}
                            className="w-4 h-4 rounded border-gray-600 text-[#bd2323] focus:ring-[#bd2323] focus:ring-offset-0 bg-gray-700"
                          />
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-white">
                            {teacher.name}
                          </div>
                          <div className="text-sm text-gray-400">
                            {teacher.email}
                          </div>
                        </div>
                        <div className="w-32">
                          <span className="px-2 py-1 text-xs rounded-full bg-gray-700 text-gray-300">
                            {teacher.department || "Not set"}
                          </span>
                        </div>
                        <div className="w-24">
                          {teacherSalary ? (
                            <span
                              className={`px-2 py-1 text-xs rounded-full ${
                                teacherSalary.status === "paid"
                                  ? "bg-green-900/30 text-green-400 border border-green-800"
                                  : "bg-yellow-900/30 text-yellow-400 border border-yellow-800"
                              }`}
                            >
                              {teacherSalary.status}
                            </span>
                          ) : (
                            <span className="px-2 py-1 text-xs rounded-full bg-gray-700 text-gray-400">
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
              <div className="p-4 bg-gray-750 border-t border-gray-700">
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">
                    Selected:{" "}
                    <span className="text-white font-bold">
                      {selectedTeachers.length}
                    </span>{" "}
                    teachers
                  </span>
                  <button
                    onClick={() => setSelectedTeachers([])}
                    className="text-sm text-gray-400 hover:text-white transition-colors"
                  >
                    Clear all
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Action Panel */}
          <div className="lg:col-span-1">
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 sticky top-4">
              {activeTab === "set" && (
                <>
                  <h2 className="text-xl font-bold mb-6 flex items-center">
                    <DollarSign className="mr-2" style={{ color: "#e6c235" }} />
                    Set Salary Details
                  </h2>

                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleBulkSetSalary();
                    }}
                    className="space-y-6"
                  >
                    {/* Total Salary */}
                    <div>
                      <label className="block text-gray-300 text-sm font-medium mb-2">
                        Total Salary Amount *
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
                      disabled={loading || selectedTeachers.length === 0}
                      className="w-full py-3 px-4 bg-gradient-to-r from-[#bd2323] to-[#0a295e] text-white font-semibold rounded-lg hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ boxShadow: "0 4px 15px rgba(189, 35, 35, 0.3)" }}
                    >
                      {loading ? (
                        <div className="flex items-center justify-center">
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                          Processing...
                        </div>
                      ) : (
                        `Set Salary for ${selectedTeachers.length} Teacher${selectedTeachers.length !== 1 ? "s" : ""}`
                      )}
                    </button>

                    {/* Summary */}
                    {selectedTeachers.length > 0 && total && (
                      <div className="mt-4 p-4 bg-gray-700 rounded-lg">
                        <div className="text-sm text-gray-300 mb-2">
                          Summary:
                        </div>
                        <div className="flex justify-between mb-1">
                          <span>Teachers:</span>
                          <span className="font-bold">
                            {selectedTeachers.length}
                          </span>
                        </div>
                        <div className="flex justify-between mb-1">
                          <span>Salary per teacher:</span>
                          <span className="font-bold">₹{total}</span>
                        </div>
                        <div className="flex justify-between pt-2 border-t border-gray-600 mt-2">
                          <span>Total amount:</span>
                          <span className="font-bold text-[#e6c235]">
                            ₹{Number(total) * selectedTeachers.length}
                          </span>
                        </div>
                      </div>
                    )}
                  </form>
                </>
              )}

              {activeTab === "pay" && (
                <>
                  <h2 className="text-xl font-bold mb-6 flex items-center">
                    <CreditCard className="mr-2" style={{ color: "#e6c235" }} />
                    Process Payment
                  </h2>

                  <div className="space-y-6">
                    {/* Payment Mode Toggle */}
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setBulkPaymentMode(false)}
                        className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                          !bulkPaymentMode
                            ? "bg-[#0a295e] text-white"
                            : "bg-gray-700 text-gray-400"
                        }`}
                      >
                        Single
                      </button>
                      <button
                        onClick={() => setBulkPaymentMode(true)}
                        className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                          bulkPaymentMode
                            ? "bg-[#0a295e] text-white"
                            : "bg-gray-700 text-gray-400"
                        }`}
                      >
                        Bulk
                      </button>
                    </div>

                    {!bulkPaymentMode ? (
                      // Single Payment
                      <>
                        <div>
                          <label className="block text-gray-300 text-sm font-medium mb-2">
                            Select Teacher
                          </label>
                          <select
                            value={selectedPaymentTeacher}
                            onChange={(e) =>
                              setSelectedPaymentTeacher(e.target.value)
                            }
                            className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-[#0a295e]"
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
                          <label className="block text-gray-300 text-sm font-medium mb-2">
                            Payment Amount *
                          </label>
                          <div className="relative">
                            <DollarSign
                              className="absolute left-3 top-3 text-gray-400"
                              size={18}
                            />
                            <input
                              type="number"
                              placeholder="Enter amount"
                              className="w-full pl-10 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-[#0a295e]"
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
                          className="w-full py-3 px-4 bg-gradient-to-r from-[#0a295e] to-[#bd2323] text-white font-semibold rounded-lg hover:opacity-90 transition-all disabled:opacity-50"
                        >
                          {loading ? "Processing..." : "Process Payment"}
                        </button>
                      </>
                    ) : (
                      // Bulk Payment
                      <>
                        <div>
                          <label className="block text-gray-300 text-sm font-medium mb-2">
                            Payment Amount per Teacher *
                          </label>
                          <div className="relative">
                            <DollarSign
                              className="absolute left-3 top-3 text-gray-400"
                              size={18}
                            />
                            <input
                              type="number"
                              placeholder="Enter amount"
                              className="w-full pl-10 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-[#0a295e]"
                              value={paymentAmount}
                              onChange={(e) =>
                                setPaymentAmount(Number(e.target.value))
                              }
                            />
                          </div>
                        </div>

                        <button
                          onClick={handleBulkPaySalary}
                          disabled={
                            loading ||
                            selectedTeachers.length === 0 ||
                            !paymentAmount
                          }
                          className="w-full py-3 px-4 bg-gradient-to-r from-[#0a295e] to-[#bd2323] text-white font-semibold rounded-lg hover:opacity-90 transition-all disabled:opacity-50"
                        >
                          {loading
                            ? "Processing..."
                            : `Pay ${selectedTeachers.length} Teacher${selectedTeachers.length !== 1 ? "s" : ""}`}
                        </button>

                        {selectedTeachers.length > 0 && paymentAmount && (
                          <div className="mt-4 p-4 bg-gray-700 rounded-lg">
                            <div className="text-sm text-gray-300 mb-2">
                              Payment Summary:
                            </div>
                            <div className="flex justify-between mb-1">
                              <span>Teachers:</span>
                              <span className="font-bold">
                                {selectedTeachers.length}
                              </span>
                            </div>
                            <div className="flex justify-between mb-1">
                              <span>Amount per teacher:</span>
                              <span className="font-bold">
                                ₹{paymentAmount}
                              </span>
                            </div>
                            <div className="flex justify-between pt-2 border-t border-gray-600 mt-2">
                              <span>Total payment:</span>
                              <span className="font-bold text-[#e6c235]">
                                ₹
                                {Number(paymentAmount) *
                                  selectedTeachers.length}
                              </span>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </>
              )}

              {activeTab === "history" && (
                <>
                  <h2 className="text-xl font-bold mb-6 flex items-center">
                    <Clock className="mr-2" style={{ color: "#e6c235" }} />
                    Payment History
                  </h2>

                  <div className="space-y-4">
                    {salaries.length === 0 ? (
                      <div className="text-center text-gray-400 py-8">
                        <Clock size={48} className="mx-auto mb-4 opacity-50" />
                        No payment history yet
                      </div>
                    ) : (
                      salaries.map((salary) => (
                        <div
                          key={salary._id}
                          className="p-3 bg-gray-700 rounded-lg"
                        >
                          <div className="font-medium text-white">
                            {salary.staff?.name}
                          </div>
                          <div className="text-sm text-gray-400 mt-1">
                            Paid: ₹{salary.paid} / ₹{salary.total}
                          </div>
                          <div className="w-full bg-gray-600 rounded-full h-2 mt-2">
                            <div
                              className="h-2 rounded-full"
                              style={{
                                width: `${(salary.paid / salary.total) * 100}%`,
                                background:
                                  "linear-gradient(90deg, #bd2323, #e6c235)",
                              }}
                            />
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
                  className={`mt-4 p-3 rounded-lg flex items-center ${
                    message.type === "success"
                      ? "bg-green-900/30 text-green-400 border border-green-800"
                      : message.type === "error"
                        ? "bg-red-900/30 text-red-400 border border-red-800"
                        : "bg-blue-900/30 text-blue-400 border border-blue-800"
                  }`}
                >
                  {message.type === "success" ? (
                    <CheckCircle size={18} className="mr-2 flex-shrink-0" />
                  ) : message.type === "error" ? (
                    <XCircle size={18} className="mr-2 flex-shrink-0" />
                  ) : (
                    <AlertCircle size={18} className="mr-2 flex-shrink-0" />
                  )}
                  <span className="text-sm">{message.text}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Salary Table */}
        <div className="mt-8">
          <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
            <div className="p-4 border-b border-gray-700 flex justify-between items-center">
              <h3 className="text-lg font-bold flex items-center">
                <TrendingUp className="mr-2" style={{ color: "#e6c235" }} />
                Salary Records
              </h3>
              <button className="p-2 hover:bg-gray-700 rounded-lg transition-colors">
                <Download size={18} className="text-gray-400" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-750">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">
                      Teacher
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">
                      Total
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">
                      Paid
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">
                      Remaining
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">
                      Due Date
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {salaries.map((s) => (
                    <tr
                      key={s._id}
                      className="hover:bg-gray-750 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium text-white">
                          {s.staff?.name || "Deleted Staff"}
                        </div>
                        <div className="text-sm text-gray-400">
                          {s.staff?.email}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-white">₹{s.total}</td>
                      <td className="px-4 py-3 text-white">₹{s.paid}</td>
                      <td className="px-4 py-3">
                        <span className="text-[#e6c235] font-medium">
                          ₹{(s.total - s.paid).toFixed(2)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${
                            s.status === "paid"
                              ? "bg-green-900/30 text-green-400 border border-green-800"
                              : "bg-yellow-900/30 text-yellow-400 border border-yellow-800"
                          }`}
                        >
                          {s.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-300">
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
                          className="px-3 py-1 bg-[#0a295e] text-white text-sm rounded-lg hover:bg-opacity-80 transition-colors"
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
      </div>
    </div>
  );
}
