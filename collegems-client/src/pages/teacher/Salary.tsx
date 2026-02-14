import { useEffect, useState } from "react";
import api from "../../api/axios";
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
  ChevronRight
} from "lucide-react";

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

export default function Salary() {
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
      case 'paid':
      case 'completed':
        return {
          bg: 'bg-green-900/30',
          text: 'text-green-400',
          border: 'border-green-800',
          icon: <CheckCircle size={16} />
        };
      case 'pending':
        return {
          bg: 'bg-yellow-900/30',
          text: 'text-yellow-400',
          border: 'border-yellow-800',
          icon: <Clock size={16} />
        };
      case 'upcoming':
        return {
          bg: 'bg-blue-900/30',
          text: 'text-blue-400',
          border: 'border-blue-800',
          icon: <Calendar size={16} />
        };
      default:
        return {
          bg: 'bg-gray-900/30',
          text: 'text-gray-400',
          border: 'border-gray-800',
          icon: <AlertCircle size={16} />
        };
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const calculateProgress = (paid: number, total: number) => {
    return (paid / total) * 100;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[#bd2323] mx-auto mb-4"></div>
          <p className="text-gray-400">Loading salary details...</p>
        </div>
      </div>
    );
  }

  if (error || !salary) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-gray-800 rounded-2xl p-8 max-w-md w-full text-center border border-gray-700">
          <AlertCircle size={48} className="mx-auto mb-4 text-[#bd2323]" />
          <h3 className="text-xl font-bold text-white mb-2">No Salary Record Found</h3>
          <p className="text-gray-400 mb-6">{error || "Your salary information will appear here once available."}</p>
          <button
            onClick={fetchSalary}
            className="px-6 py-3 bg-linear-to-r from-[#bd2323] to-[#0a295e] text-white rounded-lg hover:opacity-90 transition-all"
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
    <div className="min-h-screen bg-gray-900 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div 
            className="bg-linear-to-r from-[#0a295e] to-[#bd2323] p-6 rounded-2xl"
            style={{ borderBottom: `3px solid #e6c235` }}
          >
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
              <div>
                <h1 className="text-3xl md:text-4xl font-bold text-white flex items-center">
                  <DollarSign className="mr-3" size={32} />
                  Salary Dashboard
                </h1>
                <p className="text-gray-200 mt-2">
                  Track your earnings and payment history
                </p>
              </div>
              <div className="mt-4 md:mt-0 flex space-x-3">
                <button 
                  onClick={() => setShowHistory(!showHistory)}
                  className="px-4 py-2 bg-white/10 backdrop-blur-sm rounded-lg text-white hover:bg-white/20 transition-all flex items-center"
                >
                  <History size={18} className="mr-2" />
                  {showHistory ? 'Hide History' : 'View History'}
                </button>
                <button className="px-4 py-2 bg-[#e6c235] text-black rounded-lg hover:bg-[#d4b130] transition-all flex items-center font-medium">
                  <Download size={18} className="mr-2" />
                  Download
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 mt-10">
          {/* Total Salary Card */}
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 hover:border-[#bd2323] transition-all group">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-[#bd2323]/10 rounded-lg group-hover:scale-110 transition-transform">
                <Wallet size={24} style={{ color: '#bd2323' }} />
              </div>
              <span className="text-xs font-medium px-2 py-1 rounded-full bg-gray-700 text-gray-300">
                Annual
              </span>
            </div>
            <p className="text-gray-400 text-sm mb-1">Total Salary</p>
            <p className="text-2xl font-bold text-white">{formatCurrency(salary.total)}</p>
            <p className="text-xs text-gray-500 mt-2">FY {selectedYear}</p>
          </div>

          {/* Paid Amount Card */}
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 hover:border-[#0a295e] transition-all group">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-[#0a295e]/10 rounded-lg group-hover:scale-110 transition-transform">
                <CreditCard size={24} style={{ color: '#0a295e' }} />
              </div>
              <span className="text-xs font-medium px-2 py-1 rounded-full bg-green-900/30 text-green-400 border border-green-800">
                Received
              </span>
            </div>
            <p className="text-gray-400 text-sm mb-1">Paid Amount</p>
            <p className="text-2xl font-bold text-white">{formatCurrency(salary.paid)}</p>
            <p className="text-xs text-gray-500 mt-2">Last payment: Jan 30, 2024</p>
          </div>

          {/* Remaining Amount Card */}
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 hover:border-[#e6c235] transition-all group">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-[#e6c235]/10 rounded-lg group-hover:scale-110 transition-transform">
                <TrendingUp size={24} style={{ color: '#e6c235' }} />
              </div>
              <span className="text-xs font-medium px-2 py-1 rounded-full bg-yellow-900/30 text-yellow-400 border border-yellow-800">
                Pending
              </span>
            </div>
            <p className="text-gray-400 text-sm mb-1">Remaining</p>
            <p className="text-2xl font-bold text-white">{formatCurrency(remaining)}</p>
            <p className="text-xs text-gray-500 mt-2">Due by Mar 31, 2024</p>
          </div>

          {/* Payment Progress Card */}
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-gray-700 rounded-lg">
                <Receipt size={24} className="text-gray-300" />
              </div>
              <div className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor.bg} ${statusColor.text} ${statusColor.border} border flex items-center`}>
                {statusColor.icon}
                <span className="ml-1">{salary.status}</span>
              </div>
            </div>
            <p className="text-gray-400 text-sm mb-1">Payment Progress</p>
            <div className="relative pt-1">
              <div className="flex mb-2 items-center justify-between">
                <div>
                  <span className="text-xs font-semibold inline-block text-[#e6c235]">
                    {progressPercentage.toFixed(1)}%
                  </span>
                </div>
              </div>
              <div className="overflow-hidden h-2 mb-4 text-xs flex rounded-full bg-gray-700">
                <div
                  style={{ width: `${progressPercentage}%` }}
                  className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-linear-to-r from-[#bd2323] to-[#0a295e]"
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Salary Details Table */}
          <div className="lg:col-span-2">
            <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
              <div className="px-6 py-4 bg-gray-750 border-b border-gray-700 flex justify-between items-center">
                <h2 className="text-lg font-semibold text-white flex items-center">
                  <FileText className="mr-2" size={20} style={{ color: '#e6c235' }} />
                  Salary Breakdown
                </h2>
                <select 
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="px-3 py-1 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-[#bd2323]"
                >
                  <option>2024</option>
                  <option>2023</option>
                  <option>2022</option>
                </select>
              </div>
              
              <div className="p-6">
                <div className="space-y-4">
                  {/* Detailed Breakdown */}
                  <div className="bg-gray-750 rounded-lg p-4 border border-gray-700">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-gray-400">Basic Salary</span>
                      <span className="text-white font-medium">{formatCurrency(salary.total * 0.6)}</span>
                    </div>
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-gray-400">HRA</span>
                      <span className="text-white font-medium">{formatCurrency(salary.total * 0.2)}</span>
                    </div>
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-gray-400">Allowances</span>
                      <span className="text-white font-medium">{formatCurrency(salary.total * 0.15)}</span>
                    </div>
                    <div className="flex justify-between items-center pt-3 border-t border-gray-700">
                      <span className="text-gray-300 font-medium">Total</span>
                      <span className="text-white font-bold text-lg">{formatCurrency(salary.total)}</span>
                    </div>
                  </div>

                  {/* Payment Summary */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-750 rounded-lg p-4 border border-gray-700">
                      <p className="text-gray-400 text-sm mb-1">Total Paid</p>
                      <p className="text-2xl font-bold text-green-400">{formatCurrency(salary.paid)}</p>
                      <p className="text-xs text-gray-500 mt-2">2 payments</p>
                    </div>
                    <div className="bg-gray-750 rounded-lg p-4 border border-gray-700">
                      <p className="text-gray-400 text-sm mb-1">Balance</p>
                      <p className="text-2xl font-bold text-[#bd2323]">{formatCurrency(remaining)}</p>
                      <p className="text-xs text-gray-500 mt-2">1 pending</p>
                    </div>
                  </div>

                  {/* Next Payment */}
                  <div className="bg-linear-to-r from-[#0a295e]/20 to-[#bd2323]/20 rounded-lg p-4 border border-[#e6c235]">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-300 mb-1">Next Payment</p>
                        <p className="text-xl font-bold text-white">{formatCurrency(salary.total * 0.5)}</p>
                        <p className="text-xs text-gray-400">Due: March 30, 2024</p>
                      </div>
                      <div className="p-3 bg-[#e6c235]/20 rounded-full">
                        <Calendar size={24} style={{ color: '#e6c235' }} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Quick Actions */}
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <CreditCard className="mr-2" size={20} style={{ color: '#e6c235' }} />
                Quick Actions
              </h3>
              <div className="space-y-3">
                <button className="w-full flex items-center justify-between p-3 bg-gray-750 rounded-lg hover:bg-gray-700 transition-all group">
                  <span className="flex items-center">
                    <Eye size={18} className="mr-3 text-gray-400 group-hover:text-[#bd2323] transition-colors" />
                    <span>View Salary Slip</span>
                  </span>
                  <ChevronRight size={18} className="text-gray-500 group-hover:text-white transition-colors" />
                </button>
                <button className="w-full flex items-center justify-between p-3 bg-gray-750 rounded-lg hover:bg-gray-700 transition-all group">
                  <span className="flex items-center">
                    <Download size={18} className="mr-3 text-gray-400 group-hover:text-[#0a295e] transition-colors" />
                    <span>Download Statement</span>
                  </span>
                  <ChevronRight size={18} className="text-gray-500 group-hover:text-white transition-colors" />
                </button>
                <button className="w-full flex items-center justify-between p-3 bg-gray-750 rounded-lg hover:bg-gray-700 transition-all group">
                  <span className="flex items-center">
                    <History size={18} className="mr-3 text-gray-400 group-hover:text-[#e6c235] transition-colors" />
                    <span>Request History</span>
                  </span>
                  <ChevronRight size={18} className="text-gray-500 group-hover:text-white transition-colors" />
                </button>
              </div>
            </div>

            {/* Payment History */}
            {showHistory && (
              <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <History className="mr-2" size={20} style={{ color: '#e6c235' }} />
                  Payment History
                </h3>
                <div className="space-y-3">
                  {mockSalaryHistory.map((item, index) => {
                    const status = getStatusColor(item.status);
                    return (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-750 rounded-lg">
                        <div>
                          <p className="text-sm font-medium text-white">{item.month}</p>
                          <p className="text-xs text-gray-400">{item.date || 'Not processed'}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-white">{formatCurrency(item.amount)}</p>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${status.bg} ${status.text} border ${status.border} inline-flex items-center`}>
                            {status.icon}
                            <span className="ml-1 capitalize">{item.status}</span>
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Summary Card */}
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <TrendingUp className="mr-2" size={20} style={{ color: '#e6c235' }} />
                Yearly Summary
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Total Earnings</span>
                  <span className="text-white font-bold">{formatCurrency(salary.total * 12)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Tax Deducted</span>
                  <span className="text-white font-bold">{formatCurrency(salary.total * 0.1)}</span>
                </div>
                <div className="flex justify-between items-center pt-3 border-t border-gray-700">
                  <span className="text-gray-300">Net Income</span>
                  <span className="text-[#e6c235] font-bold">{formatCurrency(salary.total * 12 * 0.9)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Additional Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700 flex items-start">
            <div className="p-2 bg-[#bd2323]/10 rounded-lg mr-3">
              <Calendar size={20} style={{ color: '#bd2323' }} />
            </div>
            <div>
              <p className="text-sm text-gray-400">Payment Schedule</p>
              <p className="text-white font-medium">Last day of every month</p>
            </div>
          </div>
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700 flex items-start">
            <div className="p-2 bg-[#0a295e]/10 rounded-lg mr-3">
              <DollarSign size={20} style={{ color: '#0a295e' }} />
            </div>
            <div>
              <p className="text-sm text-gray-400">Bank Account</p>
              <p className="text-white font-medium">XXXX-XXXX-XXXX-1234</p>
            </div>
          </div>
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700 flex items-start">
            <div className="p-2 bg-[#e6c235]/10 rounded-lg mr-3">
              <CheckCircle size={20} style={{ color: '#e6c235' }} />
            </div>
            <div>
              <p className="text-sm text-gray-400">Tax Regime</p>
              <p className="text-white font-medium">New Tax Regime</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}