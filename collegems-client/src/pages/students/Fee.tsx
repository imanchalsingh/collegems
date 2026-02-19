import { useEffect, useState } from "react";
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
  Wallet,
  History,
  ChevronRight,
  Smartphone,
  Landmark,
  Receipt,
  Shield,
  ArrowLeft,
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
        return "bg-green-50 text-green-700 border-green-200";
      case "partial":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "unpaid":
        return "bg-red-50 text-red-700 border-red-200";
      default:
        return "bg-gray-50 text-gray-700 border-gray-200";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case "paid":
        return <CheckCircle size={16} className="mr-1.5" />;
      case "partial":
        return <Clock size={16} className="mr-1.5" />;
      case "unpaid":
        return <XCircle size={16} className="mr-1.5" />;
      default:
        return <AlertCircle size={16} className="mr-1.5" />;
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

  const paymentMethods = [
    { id: "card", label: "Credit/Debit Card", icon: CreditCard, color: "blue" },
    { id: "upi", label: "UPI", icon: Smartphone, color: "green" },
    { id: "netbanking", label: "Net Banking", icon: Landmark, color: "purple" },
  ];

  if (loading && !fee) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent"></div>
          <p className="mt-4 text-gray-600">Loading fee details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Fee Management</h1>
            <p className="text-gray-500 mt-1">View and manage your fee payments</p>
          </div>
          <button className="inline-flex items-center gap-2 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            <Download className="w-4 h-4" />
            Download Statement
          </button>
        </div>
      </div>

      {/* Message Alert */}
      {message && (
        <div
          className={`p-4 rounded-lg flex items-start gap-3 ${
            message.type === "success"
              ? "bg-green-50 text-green-800 border border-green-200"
              : message.type === "error"
                ? "bg-red-50 text-red-800 border border-red-200"
                : "bg-blue-50 text-blue-800 border border-blue-200"
          }`}
        >
          {message.type === "success" && <CheckCircle size={20} className="shrink-0" />}
          {message.type === "error" && <XCircle size={20} className="shrink-0" />}
          {message.type === "info" && <AlertCircle size={20} className="shrink-0" />}
          <span className="flex-1 text-sm">{message.text}</span>
          <button
            onClick={() => setMessage(null)}
            className="shrink-0 text-gray-500 hover:text-gray-700"
          >
            ×
          </button>
        </div>
      )}

      {!fee ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <AlertCircle size={48} className="mx-auto mb-4 text-gray-300" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            No Fee Record Found
          </h3>
          <p className="text-gray-500">
            Please contact the administration for fee details.
          </p>
        </div>
      ) : (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-50 rounded-lg">
                  <Wallet className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Fee</p>
                  <p className="text-xl font-bold text-gray-900">
                    {formatCurrency(fee.total)}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-green-50 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Paid Amount</p>
                  <p className="text-xl font-bold text-green-600">
                    {formatCurrency(fee.paid)}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-amber-50 rounded-lg">
                  <Clock className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Remaining</p>
                  <p className="text-xl font-bold text-amber-600">
                    {formatCurrency(fee.total - fee.paid)}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-lg ${
                  fee.status === "paid" ? "bg-green-50" : 
                  fee.status === "partial" ? "bg-amber-50" : "bg-red-50"
                }`}>
                  <TrendingUp className={`w-5 h-5 ${
                    fee.status === "paid" ? "text-green-600" : 
                    fee.status === "partial" ? "text-amber-600" : "text-red-600"
                  }`} />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  <div className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${getStatusColor(fee.status)}`}>
                    {getStatusIcon(fee.status)}
                    <span className="capitalize">{fee.status}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Fee Summary & Progress */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-6">
                  Payment Progress
                </h2>

                {/* Progress Bar */}
                <div className="mb-8">
                  <div className="flex justify-between mb-2">
                    <span className="text-sm text-gray-500">Overall Progress</span>
                    <span className="text-sm font-medium text-gray-900">
                      {calculateProgress().toFixed(1)}% Complete
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2.5">
                    <div
                      className="h-2.5 rounded-full bg-blue-600 transition-all duration-500"
                      style={{ width: `${calculateProgress()}%` }}
                    ></div>
                  </div>
                </div>

                {/* Due Date Alert */}
                <div className={`p-4 rounded-lg border ${
                  getDaysUntilDue() < 0
                    ? "bg-red-50 border-red-200"
                    : getDaysUntilDue() <= 7
                      ? "bg-amber-50 border-amber-200"
                      : "bg-gray-50 border-gray-200"
                }`}>
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-lg ${
                      getDaysUntilDue() < 0
                        ? "bg-red-100"
                        : getDaysUntilDue() <= 7
                          ? "bg-amber-100"
                          : "bg-gray-200"
                    }`}>
                      <Calendar className={`w-5 h-5 ${
                        getDaysUntilDue() < 0
                          ? "text-red-600"
                          : getDaysUntilDue() <= 7
                            ? "text-amber-600"
                            : "text-gray-600"
                      }`} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-500">Due Date</p>
                      <p className="font-medium text-gray-900">{formatDate(fee.dueDate)}</p>
                    </div>
                    <div>
                      {getDaysUntilDue() < 0 ? (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                          Overdue
                        </span>
                      ) : getDaysUntilDue() === 0 ? (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                          Due Today
                        </span>
                      ) : (
                        <span className="text-sm text-gray-500">
                          {getDaysUntilDue()} days left
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-2 gap-4 mt-6">
                  {fee.scholarship && (
                    <div className="p-3 bg-purple-50 rounded-lg">
                      <p className="text-xs text-purple-600 mb-1">Scholarship</p>
                      <p className="font-medium text-gray-900">{formatCurrency(fee.scholarship)}</p>
                    </div>
                  )}
                  {fee.lateFee && (
                    <div className="p-3 bg-red-50 rounded-lg">
                      <p className="text-xs text-red-600 mb-1">Late Fee</p>
                      <p className="font-medium text-gray-900">{formatCurrency(fee.lateFee)}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Payment Section */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl border border-gray-200 p-6 sticky top-4">
                <h2 className="text-lg font-semibold text-gray-900 mb-6">
                  Make Payment
                </h2>

                <div className="space-y-5">
                  {/* Payment Method Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Payment Method
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {paymentMethods.map((method) => {
                        const Icon = method.icon;
                        const isSelected = paymentMethod === method.id;
                        return (
                          <button
                            key={method.id}
                            type="button"
                            onClick={() => setPaymentMethod(method.id)}
                            className={`
                              flex flex-col items-center gap-2 p-3 rounded-lg border transition-all
                              ${isSelected 
                                ? 'border-blue-600 bg-blue-50' 
                                : 'border-gray-200 hover:border-gray-300 bg-white'
                              }
                            `}
                          >
                            <Icon className={`w-5 h-5 ${
                              isSelected ? 'text-blue-600' : 'text-gray-500'
                            }`} />
                            <span className={`text-xs ${
                              isSelected ? 'text-blue-600 font-medium' : 'text-gray-500'
                            }`}>
                              {method.label.split(' ')[0]}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Amount Input */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Amount to Pay
                    </label>
                    <div className="relative">
                      <DollarSign
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                        size={18}
                      />
                      <input
                        type="number"
                        placeholder="Enter amount"
                        value={amount}
                        onChange={(e) => setAmount(Number(e.target.value))}
                        min="1"
                        max={fee.total - fee.paid}
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    {fee.total - fee.paid > 0 && (
                      <div className="mt-2 flex justify-between text-xs">
                        <span className="text-gray-500">Min: ₹1</span>
                        <span className="text-gray-500">
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
                        className={`
                          px-3 py-2 text-sm font-medium rounded-lg border transition-colors
                          ${amount === quickAmount
                            ? 'border-blue-600 bg-blue-50 text-blue-600'
                            : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                          }
                        `}
                      >
                        ₹{quickAmount.toLocaleString()}
                      </button>
                    ))}
                  </div>

                  {/* Security Badge */}
                  <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                    <Shield className="w-4 h-4 text-gray-500" />
                    <span className="text-xs text-gray-600">
                      Secure payment powered by Razorpay
                    </span>
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
                    className="w-full py-3 px-4 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                        Processing...
                      </div>
                    ) : (
                      `Pay ${amount ? formatCurrency(Number(amount)) : ''}`
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Payment History */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Payment History</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    {fee.installments?.length || 0} total transactions
                  </p>
                </div>
                {fee.installments && fee.installments.length > 5 && (
                  <button
                    onClick={() => setShowPaymentHistory(!showPaymentHistory)}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                  >
                    {showPaymentHistory ? 'Show Less' : 'View All'}
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            <div className="divide-y divide-gray-100">
              {fee.installments && fee.installments.length > 0 ? (
                fee.installments
                  .slice(0, showPaymentHistory ? undefined : 5)
                  .map((installment, index) => (
                    <div key={index} className="p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="p-2 bg-blue-50 rounded-lg">
                            <Receipt className="w-4 h-4 text-blue-600" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">
                              {formatCurrency(installment.amount)}
                            </p>
                            <p className="text-xs text-gray-500">
                              {formatDate(installment.paidOn)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          {installment.transactionId && (
                            <span className="text-xs text-gray-400">
                              ID: {installment.transactionId.slice(0, 8)}...
                            </span>
                          )}
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Success
                          </span>
                        </div>
                      </div>
                      {installment.paymentMethod && (
                        <div className="mt-2 ml-12">
                          <span className="text-xs text-gray-400">
                            Paid via {installment.paymentMethod}
                          </span>
                        </div>
                      )}
                    </div>
                  ))
              ) : (
                <div className="p-12 text-center">
                  <History className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No payment history found</p>
                  <p className="text-sm text-gray-400 mt-1">
                    Your payment transactions will appear here
                  </p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}