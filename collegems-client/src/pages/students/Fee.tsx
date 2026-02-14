import { useEffect, useState } from "react";
import api from "../../api/axios";

interface Installment {
  amount: number;
  paidOn: string;
}

interface Fee {
  _id: string;
  total: number;
  paid: number;
  status: string;
  dueDate: string;
  installments: Installment[];
}

export default function StudentFee() {
  const [fee, setFee] = useState<Fee | null>(null);
  const [amount, setAmount] = useState<number | "">("");
  const [message, setMessage] = useState<string>("");

  const fetchFee = async () => {
    try {
      const res = await api.get("/fee/me");
      setFee(res.data);
    } catch {
      setMessage("No fee found");
    }
  };

  useEffect(() => {
    fetchFee();
  }, []);

  const handlePay = async () => {
    if (!amount || amount <= 0) {
      setMessage("Enter a valid amount");
      return;
    }
    try {
      const res = await api.post<{ fee: Fee }>("/fee/pay", { amount });
      setFee(res.data.fee);
      setAmount("");
      setMessage("Payment successful!");
    } catch (err: any) {
      setMessage(err.response?.data?.message || "Payment failed");
    }
  };

  if (!fee) return <p>Loading...</p>;

  return (
    <div className="max-w-md mx-auto p-4 border rounded shadow">
      <h2 className="text-xl font-bold mb-2">Your Fee Details</h2>
      <p>Total: {fee.total}</p>
      <p>Paid: {fee.paid}</p>
      <p>Remaining: {fee.total - fee.paid}</p>
      <p>Status: {fee.status}</p>
      <p>Due Date: {new Date(fee.dueDate).toLocaleDateString()}</p>

      <div className="mt-4 space-y-2">
        <input
          type="number"
          placeholder="Amount to pay"
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value))}
          className="border p-2 rounded w-full"
        />
        <button
          onClick={handlePay}
          className="bg-green-600 text-white px-4 py-2 rounded w-full"
        >
          Pay
        </button>
      </div>
      {message && <p className="mt-2 text-blue-600">{message}</p>}
    </div>
  );
}
