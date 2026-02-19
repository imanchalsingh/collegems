import { useEffect, useState } from "react";
import {
  DollarSign,
  TrendingUp,
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  Download,
  Eye,
  FileText,
  CreditCard,
  Wallet,
  Receipt,
  History,
  ChevronRight,
  PieChart,
  ArrowUpRight,
  Landmark,
  ReceiptText,
} from "lucide-react";
import api from "../../api/axios";

interface Salary {
  _id: string;
  total: number;
  paid: number;
  remaining?: number;
  status: string;
  month?: string;
  year?: number;
  paymentDate?: string;
  paymentMethod?: string;
  transactionId?: string;
}

// Mock salary history for demonstration
const mockSalaryHistory = [
  { month: "January 2024", amount: 50000, status: "paid", date: "2024-01-30" },
  { month: "February 2024", amount: 50000, status: "paid", date: "2024-02-28" },
  { month: "March 2024", amount: 50000, status: "pending", date: null },
  { month: "April 2024", amount: 50000, status: "upcoming", date: null },
];

export default function HODSalary() {
  const [salary, setSalary] = useState<Salary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [selectedYear, setSelectedYear] = useState("2024");

  const fetchSalary = async () => {
    try {
      setLoading(true);
      const res = await api.get<Salary>("/salary/me");
      setSalary(res.data);
      setError(null);
    } catch (err: any) {
      console.error(err.response?.data || err.message);
      setError("Failed to load salary data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSalary();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "paid":
      case "completed":
        return {
          bg: "bg-green-50",
          text: "text-green-700",
          border: "border-green-200",
          icon: <CheckCircle size={14} />,
        };
      case "pending":
        return {
          bg: "bg-amber-50",
          text: "text-amber-700",
          border: "border-amber-200",
          icon: <Clock size={14} />,
        };
      case "upcoming":
        return {
          bg: "bg-blue-50",
          text: "text-blue-700",
          border: "border-blue-200",
          icon: <Calendar size={14} />,
        };
      default:
        return {
          bg: "bg-gray-50",
          text: "text-gray-700",
          border: "border-gray-200",
          icon: <AlertCircle size={14} />,
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

  const calculateProgress = (paid: number, total: number) => {
    return (paid / total) * 100;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent"></div>
          <p className="mt-4 text-gray-600">Loading salary details...</p>
        </div>
      </div>
    );
  }

  if (error || !salary) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
            <AlertCircle size={32} className="text-red-600" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            No Salary Record Found
          </h3>
          <p className="text-gray-600 mb-6">
            {error ||
              "Your salary information will appear here once available."}
          </p>
          <button
            onClick={fetchSalary}
            className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const remaining = salary.total - salary.paid;
  const progressPercentage = calculateProgress(salary.paid, salary.total);
  const statusColor = getStatusColor(salary.status);

  return (
    <div className="space-y-6">
      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total Salary Card */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-3">
            <div className="p-2.5 bg-blue-50 rounded-lg">
              <Wallet size={20} className="text-blue-600" />
            </div>
            <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full">
              Annual
            </span>
          </div>
          <p className="text-sm text-gray-500 mb-1">Total Salary</p>
          <p className="text-xl font-bold text-gray-900">
            {formatCurrency(salary.total)}
          </p>
          <p className="text-xs text-gray-400 mt-2">FY {selectedYear}</p>
        </div>

        {/* Paid Amount Card */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-3">
            <div className="p-2.5 bg-green-50 rounded-lg">
              <CreditCard size={20} className="text-green-600" />
            </div>
            <span className="text-xs px-2 py-1 bg-green-50 text-green-700 rounded-full border border-green-200">
              Received
            </span>
          </div>
          <p className="text-sm text-gray-500 mb-1">Paid Amount</p>
          <p className="text-xl font-bold text-gray-900">
            {formatCurrency(salary.paid)}
          </p>
          <p className="text-xs text-gray-400 mt-2">
            Last payment: Jan 30, 2024
          </p>
        </div>

        {/* Remaining Amount Card */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-3">
            <div className="p-2.5 bg-amber-50 rounded-lg">
              <TrendingUp size={20} className="text-amber-600" />
            </div>
            <span className="text-xs px-2 py-1 bg-amber-50 text-amber-700 rounded-full border border-amber-200">
              Pending
            </span>
          </div>
          <p className="text-sm text-gray-500 mb-1">Remaining</p>
          <p className="text-xl font-bold text-gray-900">
            {formatCurrency(remaining)}
          </p>
          <p className="text-xs text-gray-400 mt-2">Due by Mar 31, 2024</p>
        </div>

        {/* Payment Progress Card */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="p-2.5 bg-gray-100 rounded-lg">
              <Receipt size={20} className="text-gray-600" />
            </div>
            <div
              className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${statusColor.bg} ${statusColor.text} ${statusColor.border} border`}
            >
              {statusColor.icon}
              <span className="capitalize">{salary.status}</span>
            </div>
          </div>
          <p className="text-sm text-gray-500 mb-2">Payment Progress</p>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">
                {progressPercentage.toFixed(1)}%
              </span>
              <span className="text-gray-900 font-medium">
                {formatCurrency(salary.paid)} / {formatCurrency(salary.total)}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                style={{ width: `${progressPercentage}%` }}
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Salary Details Table */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="font-semibold text-gray-900 flex items-center">
                <FileText size={18} className="mr-2 text-blue-600" />
                Salary Breakdown
              </h2>
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <History size={18} />
                {showHistory ? "Hide History" : "View History"}
              </button>
            </div>

            <div className="p-5">
              <div className="space-y-4">
                {/* Detailed Breakdown */}
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Basic Salary</span>
                      <span className="text-gray-900 font-medium">
                        {formatCurrency(salary.total * 0.6)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">HRA</span>
                      <span className="text-gray-900 font-medium">
                        {formatCurrency(salary.total * 0.2)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Allowances</span>
                      <span className="text-gray-900 font-medium">
                        {formatCurrency(salary.total * 0.15)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center pt-3 border-t border-gray-200">
                      <span className="text-gray-700 font-medium">Total</span>
                      <span className="text-gray-900 font-bold text-lg">
                        {formatCurrency(salary.total)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Payment Summary */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                    <p className="text-sm text-green-700 mb-1">Total Paid</p>
                    <p className="text-xl font-bold text-green-700">
                      {formatCurrency(salary.paid)}
                    </p>
                    <p className="text-xs text-green-600 mt-2">
                      2 payments completed
                    </p>
                  </div>
                  <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
                    <p className="text-sm text-amber-700 mb-1">Balance</p>
                    <p className="text-xl font-bold text-amber-700">
                      {formatCurrency(remaining)}
                    </p>
                    <p className="text-xs text-amber-600 mt-2">
                      1 payment pending
                    </p>
                  </div>
                </div>

                {/* Next Payment */}
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-blue-700 mb-1">Next Payment</p>
                      <p className="text-xl font-bold text-blue-700">
                        {formatCurrency(salary.total * 0.5)}
                      </p>
                      <p className="text-xs text-blue-600 mt-1">
                        Due: March 30, 2024
                      </p>
                    </div>
                    <div className="p-3 bg-blue-100 rounded-full">
                      <Calendar size={24} className="text-blue-600" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="lg:col-span-1 space-y-5">
          {/* Quick Actions */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
              <CreditCard size={18} className="mr-2 text-blue-600" />
              Quick Actions
            </h3>
            <div className="space-y-2">
              <button className="w-full flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors group">
                <span className="flex items-center text-sm text-gray-700">
                  <Eye
                    size={16}
                    className="mr-3 text-gray-500 group-hover:text-blue-600 transition-colors"
                  />
                  View Salary Slip
                </span>
                <ChevronRight
                  size={16}
                  className="text-gray-400 group-hover:text-gray-600 transition-colors"
                />
              </button>
              <button className="w-full flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors group">
                <span className="flex items-center text-sm text-gray-700">
                  <Download
                    size={16}
                    className="mr-3 text-gray-500 group-hover:text-blue-600 transition-colors"
                  />
                  Download Statement
                </span>
                <ChevronRight
                  size={16}
                  className="text-gray-400 group-hover:text-gray-600 transition-colors"
                />
              </button>
              <button className="w-full flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors group">
                <span className="flex items-center text-sm text-gray-700">
                  <History
                    size={16}
                    className="mr-3 text-gray-500 group-hover:text-blue-600 transition-colors"
                  />
                  Request History
                </span>
                <ChevronRight
                  size={16}
                  className="text-gray-400 group-hover:text-gray-600 transition-colors"
                />
              </button>
            </div>
          </div>

          {/* Payment History */}
          {showHistory && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
                <History size={18} className="mr-2 text-blue-600" />
                Payment History
              </h3>
              <div className="space-y-3">
                {mockSalaryHistory.map((item, index) => {
                  const status = getStatusColor(item.status);
                  return (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {item.month}
                        </p>
                        <p className="text-xs text-gray-500">
                          {item.date || "Not processed"}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-gray-900">
                          {formatCurrency(item.amount)}
                        </p>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${status.bg} ${status.text} border ${status.border}`}
                        >
                          {status.icon}
                          <span className="capitalize">{item.status}</span>
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Yearly Summary */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
              <PieChart size={18} className="mr-2 text-blue-600" />
              Yearly Summary
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Gross Earnings</span>
                <span className="text-gray-900 font-medium">
                  {formatCurrency(salary.total * 12)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Tax Deducted</span>
                <span className="text-red-600 font-medium">
                  -{formatCurrency(salary.total * 0.1)}
                </span>
              </div>
              <div className="flex justify-between items-center pt-3 border-t border-gray-200">
                <span className="text-gray-700 font-medium">Net Income</span>
                <span className="text-blue-600 font-bold">
                  {formatCurrency(salary.total * 12 * 0.9)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Additional Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-start gap-3">
          <div className="p-2 bg-blue-50 rounded-lg shrink-0">
            <Calendar size={18} className="text-blue-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500">Payment Schedule</p>
            <p className="text-sm font-medium text-gray-900">
              Last day of every month
            </p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-start gap-3">
          <div className="p-2 bg-green-50 rounded-lg shrink-0">
            <Landmark size={18} className="text-green-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500">Bank Account</p>
            <p className="text-sm font-medium text-gray-900">
              HDFC Bank •••• 1234
            </p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-start gap-3">
          <div className="p-2 bg-purple-50 rounded-lg shrink-0">
            <ReceiptText size={18} className="text-purple-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500">Tax Regime</p>
            <p className="text-sm font-medium text-gray-900">New Tax Regime</p>
          </div>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900 flex items-center">
            <Receipt size={18} className="mr-2 text-blue-600" />
            Recent Transactions
          </h3>
          <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
            View all
          </button>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((_, i) => (
            <div
              key={i}
              className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <ArrowUpRight size={16} className="text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    Salary Credit - February 2024
                  </p>
                  <p className="text-xs text-gray-500">Feb 28, 2024</p>
                </div>
              </div>
              <span className="text-sm font-medium text-green-600">
                +₹50,000
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
