import { useState, useEffect } from "react";
import { isAxiosError } from "axios";
import api from "../api/axios";
import { extractArray } from "../utils/apiHelpers";
import { CheckCircle, XCircle, Clock, Wallet } from "lucide-react";
import { getAcademicLabel } from "../utils/academicLabels";
import { useAcademicLabels } from "../hooks/useAcademicLabels";

interface Installment {
  _id: string;
  amount: number;
  paidOn: string;
  status: "pending" | "confirmed" | "rejected";
  requestedBy?: { name?: string; email?: string };
}

interface Fee {
  _id: string;
  student: { name?: string; email?: string; studentId?: string };
  total: number;
  paid: number;
  installments: Installment[];
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
  }).format(amount);

export default function FeePaymentApprovals() {
  const { data: academicLabels } = useAcademicLabels();
  const [fees, setFees] = useState<Fee[]>([]);
  const [loading, setLoading] = useState(true);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchPending = async () => {
    try {
      setLoading(true);
      const res = await api.get("/fee/pending");
      setFees(extractArray(res.data));
    } catch (error) {
      console.error("Failed to fetch pending fee payments", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPending();
  }, []);

  const handleReview = async (feeId: string, installmentId: string, action: "confirm" | "reject") => {
    setActioningId(installmentId);
    setMessage(null);
    try {
      await api.post(`/fee/installments/${feeId}/${installmentId}/${action}`);
      setMessage({
        type: "success",
        text: action === "confirm" ? "Payment confirmed" : "Payment rejected",
      });
      await fetchPending();
    } catch (error) {
      const text = isAxiosError(error) ? error.response?.data?.message : undefined;
      setMessage({
        type: "error",
        text: text || `Failed to ${action} payment`,
      });
    } finally {
      setActioningId(null);
    }
  };

  const pendingRows = fees.flatMap((fee) =>
    fee.installments
      .filter((installment) => installment.status === "pending")
      .map((installment) => ({ fee, installment })),
  );

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Fee Payment Approvals</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          {getAcademicLabel("student", academicLabels)}s and parents submit payment claims here first - confirm or reject each one
          before it counts toward the student's balance.
        </p>
      </div>

      {message && (
        <div
          className={`p-4 rounded-lg text-sm ${
            message.type === "success"
              ? "bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-800"
              : "bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800"
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-500 dark:text-gray-400">Loading...</div>
        ) : pendingRows.length === 0 ? (
          <div className="p-12 text-center">
            <Wallet className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">No payments awaiting confirmation</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {pendingRows.map(({ fee, installment }) => (
              <div key={installment._id} className="p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-amber-50 dark:bg-amber-900/30 rounded-lg">
                    <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {fee.student?.name || "Unknown student"}{" "}
                      <span className="text-gray-400 font-normal">({fee.student?.studentId || fee.student?.email})</span>
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Claims to have paid {formatCurrency(installment.amount)} on{" "}
                      {new Date(installment.paidOn).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                      {installment.requestedBy?.name ? ` · submitted by ${installment.requestedBy.name}` : ""}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleReview(fee._id, installment._id, "confirm")}
                    disabled={actioningId === installment._id}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Confirm
                  </button>
                  <button
                    onClick={() => handleReview(fee._id, installment._id, "reject")}
                    disabled={actioningId === installment._id}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-300 dark:hover:bg-red-900/40 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <XCircle className="w-4 h-4" />
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
