import { useEffect, useState } from "react";
import api from "../../api/axios";
import {
  CreditCard,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  TrendingUp,
  AlertCircle,
  Download,
  History,
} from "lucide-react";

interface Installment {
  amount: number;
  paidOn: string;
  transactionId?: string;
  paymentMethod?: string;
}

interface Fee {
  _id: string;
  total: number;
  paid: number;
  status: string;
  dueDate: string;
  installments: Installment[];
  lateFee?: number;
  scholarship?: number;
}

export default function StudentFee() {
  const [fee, setFee] = useState<Fee | null>(null);
  const [amount, setAmount] = useState<number | "">("");
  const [message, setMessage] = useState<{
    type: "success" | "error" | "info";
    text: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<string>("card");
  const [showPaymentHistory, setShowPaymentHistory] = useState(false);

  const fetchFee = async () => {
    try {
      setLoading(true);
      const res = await api.get("/fee/me");
      setFee(res.data);
      setMessage(null);
    } catch {
      setMessage({
        type: "info",
        text: "No fee record found. Please contact administration.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFee();
  }, []);

  const handlePay = async () => {
    if (!amount || amount <= 0) {
      setMessage({
        type: "error",
        text: "Please enter a valid amount",
      });
      return;
    }

    if (fee && Number(amount) > fee.total - fee.paid) {
      setMessage({
        type: "error",
        text: `Amount cannot exceed remaining balance of ₹${fee.total - fee.paid}`,
      });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const res = await api.post<{ fee: Fee; transactionId: string }>(
        "/fee/pay",
        {
          amount: Number(amount),
          paymentMethod,
        },
      );

      setFee(res.data.fee);
      setAmount("");
      setMessage({
        type: "success",
        text: `Payment of ₹${amount} successful! Transaction ID: ${res.data.transactionId}`,
      });

      // Auto-hide success message after 5 seconds
      setTimeout(() => {
        setMessage(null);
      }, 5000);
    } catch (err: any) {
      setMessage({
        type: "error",
        text:
          err.response?.data?.message || "Payment failed. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "paid":
        return "text-green-400 bg-green-900/30 border-green-800";
      case "partial":
        return "text-[#e6c235] bg-yellow-900/30 border-[#e6c235]";
      case "unpaid":
        return "text-[#bd2323] bg-red-900/30 border-[#bd2323]";
      default:
        return "text-gray-400 bg-gray-800 border-gray-700";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case "paid":
        return <CheckCircle size={16} className="mr-1" />;
      case "partial":
        return <Clock size={16} className="mr-1" />;
      case "unpaid":
        return <XCircle size={16} className="mr-1" />;
      default:
        return <AlertCircle size={16} className="mr-1" />;
    }
  };

  const calculateProgress = () => {
    if (!fee) return 0;
    return (fee.paid / fee.total) * 100;
  };

  const getDaysUntilDue = () => {
    if (!fee) return 0;
    const today = new Date();
    const due = new Date(fee.dueDate);
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (loading && !fee) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#bd2323] mx-auto mb-4"></div>
          <p className="text-gray-400">Loading fee details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        {message && (
          <div
            className={`mb-6 p-4 rounded-lg flex items-center ${
              message.type === "success"
                ? "bg-green-900/30 text-green-400 border border-green-800"
                : message.type === "error"
                  ? "bg-red-900/30 text-red-400 border border-red-800"
                  : "bg-blue-900/30 text-blue-400 border border-blue-800"
            }`}
          >
            {message.type === "success" && (
              <CheckCircle size={20} className="mr-3 shrink-0" />
            )}
            {message.type === "error" && (
              <XCircle size={20} className="mr-3 shrink-0" />
            )}
            {message.type === "info" && (
              <AlertCircle size={20} className="mr-3 shrink-0" />
            )}
            <span className="flex-1">{message.text}</span>
            <button
              onClick={() => setMessage(null)}
              className="ml-4 text-gray-400 hover:text-white"
            >
              ×
            </button>
          </div>
        )}

        {!fee ? (
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-12 text-center">
            <AlertCircle size={48} className="mx-auto mb-4 text-gray-600" />
            <h3 className="text-xl font-bold text-white mb-2">
              No Fee Record Found
            </h3>
            <p className="text-gray-400">
              Please contact the administration for fee details.
            </p>
          </div>
        ) : (
          <>
            {/* Main Fee Card */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
              {/* Fee Summary */}
              <div className="lg:col-span-2">
                <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
                  <h2 className="text-xl font-bold mb-6 flex items-center">
                    <TrendingUp className="mr-2" style={{ color: "#e6c235" }} />
                    Fee Summary
                  </h2>

                  {/* Progress Bar */}
                  <div className="mb-6">
                    <div className="flex justify-between mb-2">
                      <span className="text-gray-400">Payment Progress</span>
                      <span className="text-white font-bold">
                        {calculateProgress().toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-3">
                      <div
                        className="h-3 rounded-full transition-all duration-500"
                        style={{
                          width: `${calculateProgress()}%`,
                          background:
                            "linear-gradient(90deg, #bd2323, #e6c235)",
                        }}
                      ></div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="p-4 bg-gray-700/50 rounded-lg">
                      <div className="text-sm text-gray-400 mb-1">
                        Total Fee
                      </div>
                      <div className="text-2xl font-bold text-white">
                        {formatCurrency(fee.total)}
                      </div>
                    </div>
                    <div className="p-4 bg-gray-700/50 rounded-lg">
                      <div className="text-sm text-gray-400 mb-1">
                        Paid Amount
                      </div>
                      <div className="text-2xl font-bold text-green-400">
                        {formatCurrency(fee.paid)}
                      </div>
                    </div>
                    <div className="p-4 bg-gray-700/50 rounded-lg">
                      <div className="text-sm text-gray-400 mb-1">
                        Remaining
                      </div>
                      <div className="text-2xl font-bold text-[#e6c235]">
                        {formatCurrency(fee.total - fee.paid)}
                      </div>
                    </div>
                    <div className="p-4 bg-gray-700/50 rounded-lg">
                      <div className="text-sm text-gray-400 mb-1">Status</div>
                      <div
                        className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(fee.status)}`}
                      >
                        {getStatusIcon(fee.status)}
                        <span className="capitalize ml-1">{fee.status}</span>
                      </div>
                    </div>
                  </div>

                  {/* Due Date Alert */}
                  <div
                    className={`p-4 rounded-lg border ${
                      getDaysUntilDue() < 0
                        ? "bg-red-900/30 border-red-800"
                        : getDaysUntilDue() <= 7
                          ? "bg-yellow-900/30 border-[#e6c235]"
                          : "bg-gray-700/30 border-gray-700"
                    }`}
                  >
                    <div className="flex items-center">
                      <Calendar
                        className="mr-3"
                        size={20}
                        style={{
                          color:
                            getDaysUntilDue() < 0
                              ? "#bd2323"
                              : getDaysUntilDue() <= 7
                                ? "#e6c235"
                                : "#ffffff",
                        }}
                      />
                      <div>
                        <div className="text-sm text-gray-400">Due Date</div>
                        <div className="font-bold">
                          {formatDate(fee.dueDate)}
                        </div>
                      </div>
                      <div className="ml-auto">
                        {getDaysUntilDue() < 0 ? (
                          <span className="text-[#bd2323] font-medium">
                            Overdue
                          </span>
                        ) : getDaysUntilDue() === 0 ? (
                          <span className="text-[#e6c235] font-medium">
                            Due Today
                          </span>
                        ) : (
                          <span className="text-gray-400">
                            {getDaysUntilDue()} days left
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment Section */}
              <div className="lg:col-span-1">
                <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 sticky top-4">
                  <h2 className="text-xl font-bold mb-6 flex items-center">
                    <CreditCard className="mr-2" style={{ color: "#e6c235" }} />
                    Make Payment
                  </h2>

                  <div className="space-y-4">
                    {/* Payment Method Selection */}
                    <div>
                      <label className="block text-gray-300 text-sm font-medium mb-2">
                        Payment Method
                      </label>
                      <select
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-[#bd2323]"
                      >
                        <option value="card">Credit/Debit Card</option>
                        <option value="upi">UPI</option>
                        <option value="netbanking">Net Banking</option>
                      </select>
                    </div>

                    {/* Amount Input */}
                    <div>
                      <label className="block text-gray-300 text-sm font-medium mb-2">
                        Amount to Pay
                      </label>
                      <div className="relative">
                        <DollarSign
                          className="absolute left-3 top-3 text-gray-400"
                          size={18}
                        />
                        <input
                          type="number"
                          placeholder="Enter amount"
                          value={amount}
                          onChange={(e) => setAmount(Number(e.target.value))}
                          min="1"
                          max={fee.total - fee.paid}
                          className="w-full pl-10 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-[#bd2323]"
                        />
                      </div>
                      {fee.total - fee.paid > 0 && (
                        <div className="mt-2 flex justify-between text-sm">
                          <span className="text-gray-400">Min: ₹1</span>
                          <span className="text-gray-400">
                            Max: {formatCurrency(fee.total - fee.paid)}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Quick Amount Buttons */}
                    <div className="grid grid-cols-3 gap-2">
                      {[1000, 5000, 10000].map((quickAmount) => (
                        <button
                          key={quickAmount}
                          onClick={() => setAmount(quickAmount)}
                          className="px-2 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm font-medium transition-colors"
                          style={{
                            border: "1px solid #374151",
                            color:
                              amount === quickAmount ? "#e6c235" : "#9CA3AF",
                          }}
                        >
                          ₹{quickAmount}
                        </button>
                      ))}
                    </div>

                    {/* Pay Button */}
                    <button
                      onClick={handlePay}
                      disabled={
                        loading ||
                        !amount ||
                        Number(amount) <= 0 ||
                        Number(amount) > fee.total - fee.paid
                      }
                      className="w-full py-3 px-4 bg-linear-to-r from-[#bd2323] to-[#0a295e] text-white font-semibold rounded-lg hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ boxShadow: "0 4px 15px rgba(189, 35, 35, 0.3)" }}
                    >
                      {loading ? (
                        <div className="flex items-center justify-center">
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                          Processing...
                        </div>
                      ) : (
                        `Pay ${amount ? formatCurrency(Number(amount)) : ""}`
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Installment History */}
            <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
              <div className="p-6 border-b border-gray-700">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold flex items-center">
                    <History className="mr-2" style={{ color: "#e6c235" }} />
                    Payment History
                  </h2>
                  <button
                    onClick={() => setShowPaymentHistory(!showPaymentHistory)}
                    className="text-sm text-gray-400 hover:text-white transition-colors"
                  >
                    {showPaymentHistory ? "Show Less" : "View All"}
                  </button>
                </div>
              </div>

              <div className="divide-y divide-gray-700">
                {fee.installments && fee.installments.length > 0 ? (
                  fee.installments
                    .slice(0, showPaymentHistory ? undefined : 5)
                    .map((installment, index) => (
                      <div
                        key={index}
                        className="p-4 hover:bg-gray-750 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <div
                              className="w-10 h-10 rounded-full flex items-center justify-center mr-3"
                              style={{
                                backgroundColor: "rgba(189, 35, 35, 0.1)",
                              }}
                            >
                              <DollarSign
                                size={18}
                                style={{ color: "#bd2323" }}
                              />
                            </div>
                            <div>
                              <div className="font-medium text-white">
                                {formatCurrency(installment.amount)}
                              </div>
                              <div className="text-sm text-gray-400">
                                {formatDate(installment.paidOn)}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center">
                            {installment.transactionId && (
                              <span className="text-xs text-gray-500 mr-4">
                                ID: {installment.transactionId.slice(0, 8)}...
                              </span>
                            )}
                            <span className="px-3 py-1 text-xs rounded-full bg-green-900/30 text-green-400 border border-green-800">
                              Success
                            </span>
                          </div>
                        </div>
                        {installment.paymentMethod && (
                          <div className="mt-2 ml-13 pl-13">
                            <span className="text-xs text-gray-500">
                              Paid via {installment.paymentMethod}
                            </span>
                          </div>
                        )}
                      </div>
                    ))
                ) : (
                  <div className="p-12 text-center">
                    <History size={48} className="mx-auto mb-4 text-gray-600" />
                    <p className="text-gray-400">No payment history found</p>
                  </div>
                )}
              </div>

              {/* Download Statement Button */}
              {fee.installments && fee.installments.length > 0 && (
                <div className="p-4 border-t border-gray-700">
                  <button
                    onClick={() => alert("Download fee statement")}
                    className="flex items-center text-gray-400 hover:text-white transition-colors"
                  >
                    <Download size={18} className="mr-2" />
                    Download Fee Statement
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
