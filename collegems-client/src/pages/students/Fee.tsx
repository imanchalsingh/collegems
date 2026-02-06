import { useEffect, useState } from "react";
import api from "../../api/axios";
import { 
  PieChart, Pie, Line, ResponsiveContainer,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from "recharts";

export default function Fees() {
  const [fee, setFee] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("upi");
  const [installmentPlan, setInstallmentPlan] = useState<number>(0);

  useEffect(() => {
    fetchFeesData();
  }, []);

  const fetchFeesData = async () => {
    try {
      setLoading(true);
      const [feeRes] = await Promise.all([
        api.get("/fee/me"),
      ]);
      setFee(feeRes.data);
    } catch (err: any) {
      console.error("Error fetching fees data:", err);
      alert("Failed to load fees data");
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async () => {
    if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
      alert("Please enter a valid amount");
      return;
    }

    if (parseFloat(paymentAmount) > (fee.total - fee.paid)) {
      alert("Payment amount cannot exceed due amount");
      return;
    }

    setPaymentLoading(true);
    try {
      // Simulate API call for payment
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Mock payment response
      const mockPaymentResponse = {
        id: `txn_${Date.now()}`,
        amount: parseFloat(paymentAmount),
        method: paymentMethod,
        status: "success",
        date: new Date().toISOString(),
        feeId: fee._id
      };

      // Update local state
      setFee((prev: any) => ({
        ...prev,
        paid: prev.paid + parseFloat(paymentAmount),
        lastPayment: new Date().toISOString()
      }));

      // Add to transactions
      setTransactions(prev => [{
        _id: mockPaymentResponse.id,
        amount: mockPaymentResponse.amount,
        method: mockPaymentResponse.method,
        status: mockPaymentResponse.status,
        date: mockPaymentResponse.date,
        type: "payment",
        description: `Fee payment via ${paymentMethod}`
      }, ...prev]);

      alert(`Payment of ₹${paymentAmount} successful! ✅`);
      setShowPaymentModal(false);
      setPaymentAmount("");
    } catch (error) {
      alert("Payment failed. Please try again.");
    } finally {
      setPaymentLoading(false);
    }
  };

  const calculateInstallments = () => {
    if (!fee) return [];
    const dueAmount = fee.total - fee.paid;
    const plans = [
      { months: 1, amount: dueAmount, label: "Full Payment" },
      { months: 2, amount: dueAmount / 2, label: "2 Installments" },
      { months: 3, amount: dueAmount / 3, label: "3 Installments" },
      { months: 4, amount: dueAmount / 4, label: "4 Installments" },
    ];
    return plans.filter(plan => plan.amount > 0);
  };

  const processChartData = () => {
    if (!fee) return {};

    const dueAmount = fee.total - fee.paid;
    
    // Pie chart data
    const pieData = [
      { name: "Paid", value: fee.paid, color: "#10b981" },
      { name: "Due", value: dueAmount, color: "#ef4444" },
    ];

    // Area chart data (payment history)
    const monthlyData = transactions.reduce((acc: any, txn) => {
      const month = new Date(txn.date).toLocaleDateString('en-US', { month: 'short' });
      if (!acc[month]) acc[month] = { amount: 0, count: 0 };
      if (txn.type === "payment" && txn.status === "success") {
        acc[month].amount += txn.amount;
        acc[month].count++;
      }
      return acc;
    }, {});

    const areaData = Object.entries(monthlyData).map(([month, data]: any) => ({
      month,
      amount: data.amount,
      payments: data.count
    }));

    return { pieData, areaData, dueAmount };
  };

  const { pieData = [], areaData = [], dueAmount = 0 } = processChartData();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#bd2323]"></div>
          <p className="mt-4 text-gray-400">Loading fees data...</p>
        </div>
      </div>
    );
  }

  if (!fee) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <svg className="mx-auto h-16 w-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="mt-4 text-xl font-semibold text-white">No Fee Data Found</h3>
          <p className="mt-2 text-gray-400">Please contact administration for fee details</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Fee Management</h1>
          <p className="text-gray-400">View and manage your college fees</p>
        </div>

        {/* Fee Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gray-800 rounded-xl p-6 border-l-4 border-[#10b981]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total Fee</p>
                <p className="text-3xl font-bold mt-2">₹{fee.total.toLocaleString()}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-[#10b981]/20 flex items-center justify-center">
                <svg className="w-6 h-6 text-[#10b981]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-xl p-6 border-l-4 border-[#ef4444]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Amount Due</p>
                <p className="text-3xl font-bold mt-2">₹{dueAmount.toLocaleString()}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-[#ef4444]/20 flex items-center justify-center">
                <svg className="w-6 h-6 text-[#ef4444]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.698-.833-2.464 0L4.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-xl p-6 border-l-4 border-[#e6c235]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Amount Paid</p>
                <p className="text-3xl font-bold mt-2">₹{fee.paid.toLocaleString()}</p>
                <p className="text-sm text-gray-400 mt-1">
                  {fee.total > 0 ? Math.round((fee.paid / fee.total) * 100) : 0}% of total
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-[#e6c235]/20 flex items-center justify-center">
                <svg className="w-6 h-6 text-[#e6c235]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Pie Chart */}
          <div className="bg-gray-800 rounded-xl p-6">
            <h3 className="text-xl font-semibold mb-4">Fee Distribution</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Line key={`line-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value) => [`₹${value}`, 'Amount']}
                    contentStyle={{ backgroundColor: '#1f2937', borderColor: '#4b5563', color: 'white' }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Area Chart */}
          <div className="bg-gray-800 rounded-xl p-6">
            <h3 className="text-xl font-semibold mb-4">Payment History</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={areaData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#4b5563" />
                  <XAxis dataKey="month" stroke="#9ca3af" />
                  <YAxis stroke="#9ca3af" />
                  <Tooltip 
                    formatter={(value) => [`₹${value}`, 'Amount']}
                    contentStyle={{ backgroundColor: '#1f2937', borderColor: '#4b5563', color: 'white' }}
                  />
                  <Legend />
                  <Area 
                    type="monotone" 
                    dataKey="amount" 
                    name="Amount Paid" 
                    stroke="#0a295e" 
                    fill="#0a295e" 
                    fillOpacity={0.3}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Action Section */}
        <div className="bg-gray-800 rounded-xl p-6 mb-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div>
              <h3 className="text-xl font-semibold mb-2">Make Payment</h3>
              <p className="text-gray-400">Pay your due fees securely online</p>
            </div>
            
            <div className="flex items-center space-x-4 mt-4 md:mt-0">
              <div className="text-right">
                <p className="text-gray-400 text-sm">Due Amount</p>
                <p className="text-2xl font-bold">₹{dueAmount.toLocaleString()}</p>
              </div>
              
              <button
                onClick={() => setShowPaymentModal(true)}
                disabled={dueAmount <= 0}
                className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                  dueAmount <= 0 
                    ? "bg-gray-700 text-gray-400 cursor-not-allowed" 
                    : "bg-linear-to-r from-[#bd2323] to-[#0a295e] hover:opacity-90"
                }`}
              >
                {dueAmount <= 0 ? "No Due Amount" : "Pay Now"}
              </button>
            </div>
          </div>

          {/* Installment Plans */}
          {dueAmount > 0 && (
            <div className="mt-6 pt-6 border-t border-gray-700">
              <h4 className="text-lg font-semibold mb-4">Suggested Payment Plans</h4>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {calculateInstallments().map((plan, index) => (
                  <div 
                    key={index}
                    className={`p-4 rounded-lg border cursor-pointer transition-all ${
                      installmentPlan === index
                        ? "border-[#e6c235] bg-[#e6c235]/10"
                        : "border-gray-700 hover:border-gray-600"
                    }`}
                    onClick={() => {
                      setInstallmentPlan(index);
                      setPaymentAmount(plan.amount.toFixed(2));
                    }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{plan.label}</span>
                      {installmentPlan === index && (
                        <div className="w-5 h-5 rounded-full bg-[#e6c235] flex items-center justify-center">
                          <svg className="w-3 h-3 text-black" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <p className="text-2xl font-bold">₹{plan.amount.toFixed(0)}</p>
                    {plan.months > 1 && (
                      <p className="text-sm text-gray-400 mt-1">per installment</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Transactions History */}
        <div className="bg-gray-800 rounded-xl p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-semibold">Transaction History</h3>
            <button
              onClick={fetchFeesData}
              className="flex items-center px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors text-sm"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
          </div>

          {transactions.length === 0 ? (
            <div className="text-center py-8">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="mt-4 text-gray-400">No transactions found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Date & Time</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Description</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Method</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Amount</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Status</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Reference</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((txn) => (
                    <tr 
                      key={txn._id} 
                      className="border-b border-gray-700/50 hover:bg-gray-700/30 transition-colors"
                    >
                      <td className="py-3 px-4">
                        {new Date(txn.date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                      <td className="py-3 px-4">{txn.description || "Fee Payment"}</td>
                      <td className="py-3 px-4">
                        <span className="capitalize">{txn.method}</span>
                      </td>
                      <td className="py-3 px-4 font-medium">
                        ₹{txn.amount?.toLocaleString()}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                          txn.status === "success" 
                            ? "bg-green-500/20 text-green-400" 
                            : txn.status === "pending"
                            ? "bg-yellow-500/20 text-yellow-400"
                            : "bg-red-500/20 text-red-400"
                        }`}>
                          {txn.status === "success" ? (
                            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          ) : txn.status === "pending" ? (
                            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                            </svg>
                          ) : (
                            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                          )}
                          {txn.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-sm text-gray-400">
                        {txn._id?.slice(0, 8)}...
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-2xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold">Make Payment</h3>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="text-gray-400 hover:text-white"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  Payment Amount (₹)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">₹</span>
                  <input
                    type="number"
                    className="w-full pl-8 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-[#bd2323]"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    max={dueAmount}
                    min="1"
                  />
                </div>
                <p className="text-sm text-gray-400 mt-1">
                  Maximum: ₹{dueAmount.toLocaleString()}
                </p>
              </div>

              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  Payment Method
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {["upi", "card", "netbanking", "wallet"].map((method) => (
                    <button
                      key={method}
                      type="button"
                      className={`p-3 rounded-lg border transition-all ${
                        paymentMethod === method
                          ? "border-[#e6c235] bg-[#e6c235]/10"
                          : "border-gray-700 hover:border-gray-600"
                      }`}
                      onClick={() => setPaymentMethod(method)}
                    >
                      <div className="flex items-center">
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center mr-2 ${
                          paymentMethod === method ? "border-[#e6c235]" : "border-gray-600"
                        }`}>
                          {paymentMethod === method && (
                            <div className="w-2 h-2 rounded-full bg-[#e6c235]"></div>
                          )}
                        </div>
                        <span className="capitalize">{method}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-4 bg-gray-700/50 rounded-lg">
                <div className="flex justify-between mb-2">
                  <span className="text-gray-400">Amount Due:</span>
                  <span className="font-medium">₹{dueAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="text-gray-400">Payment Amount:</span>
                  <span className="font-medium">₹{paymentAmount || "0"}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-gray-600">
                  <span className="text-gray-400">Remaining Due:</span>
                  <span className="font-medium">₹{(dueAmount - (parseFloat(paymentAmount) || 0)).toLocaleString()}</span>
                </div>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  onClick={() => setShowPaymentModal(false)}
                  className="flex-1 px-4 py-3 border border-gray-600 rounded-lg hover:bg-gray-700 transition-colors"
                  disabled={paymentLoading}
                >
                  Cancel
                </button>
                <button
                  onClick={handlePayment}
                  disabled={paymentLoading || !paymentAmount || parseFloat(paymentAmount) <= 0}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-[#bd2323] to-[#0a295e] rounded-lg font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {paymentLoading ? (
                    <span className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                      Processing...
                    </span>
                  ) : (
                    `Pay ₹${paymentAmount || "0"}`
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}