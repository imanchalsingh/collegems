import { useEffect, useRef, useState } from "react";
import {
  CalendarClock,
  CheckCircle2,
  CreditCard,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import api from "../api/axios";
import PaymentCheckoutModal from "./PaymentCheckoutModal";

type PlanType = "2_stage" | "4_stage" | "monthly";

interface ScheduledInstallment {
  _id: string;
  sequence: number;
  amount: number;
  dueDate: string;
  status: "upcoming" | "due" | "paid" | "overdue" | "cancelled";
  lateFee?: number;
  receiptNumber?: string;
  paidOn?: string;
}

interface EmiData {
  feeId: string;
  total: number;
  paid: number;
  remaining: number;
  penaltyAccrued: number;
  status: string;
  emiPlan: {
    planType: PlanType;
    active: boolean;
    gracePeriodDays: number;
    startDate: string;
  } | null;
  scheduledInstallments: ScheduledInstallment[];
  defaultProvider: string;
}

interface PreviewRow {
  sequence: number;
  amount: number;
  dueDate: string;
}

const PLAN_OPTIONS: { id: PlanType; title: string; blurb: string }[] = [
  { id: "2_stage", title: "2-stage", blurb: "Two semester installments" },
  { id: "4_stage", title: "4-stage", blurb: "Quarterly installments" },
  { id: "monthly", title: "Monthly", blurb: "12 equal EMIs" },
];

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
  }).format(amount);

const formatDate = (dateString: string) =>
  new Date(dateString).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

const statusStyles: Record<string, string> = {
  paid: "bg-green-50 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800",
  due: "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800",
  overdue:
    "bg-red-50 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800",
  upcoming:
    "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
  cancelled:
    "bg-gray-50 text-gray-500 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700",
};

interface Props {
  onPaymentComplete?: () => void;
}

export default function FeeEMIScheduler({ onPaymentComplete }: Props) {
  const [emi, setEmi] = useState<EmiData | null>(null);
  const [planType, setPlanType] = useState<PlanType>("4_stage");
  const [preview, setPreview] = useState<PreviewRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkoutSlot, setCheckoutSlot] = useState<ScheduledInstallment | null>(
    null
  );
  const loadedRef = useRef(false);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get<{ data: EmiData }>("/fee/emi/me");
      setEmi(res.data.data);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Unable to load EMI plan";
      setError(msg);
      setEmi(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    load();
  }, []);

  const handlePreview = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await api.post<{
        data: { installments: PreviewRow[] };
      }>("/fee/emi/preview", { planType });
      setPreview(res.data.data.installments);
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Preview failed"
      );
    } finally {
      setBusy(false);
    }
  };

  const handleSubscribe = async () => {
    setBusy(true);
    setError(null);
    try {
      await api.post("/fee/emi/subscribe", { planType });
      setPreview(null);
      await load();
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Could not subscribe to EMI plan"
      );
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-8 flex items-center justify-center gap-2 text-gray-500">
        <Loader2 className="w-5 h-5 animate-spin" />
        Loading EMI scheduler…
      </div>
    );
  }

  const activeSlots =
    emi?.scheduledInstallments?.filter((s) => s.status !== "cancelled") || [];
  const hasActivePlan = Boolean(emi?.emiPlan?.active && activeSlots.some((s) => s.status !== "paid"));

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <CalendarClock className="w-5 h-5 text-teal-600" />
            Fee EMI Scheduler
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Split remaining fees into installments and pay via Razorpay / Stripe
          </p>
        </div>
        {emi && (
          <div className="text-sm text-gray-600 dark:text-gray-300">
            Remaining{" "}
            <span className="font-semibold text-gray-900 dark:text-white">
              {formatCurrency(emi.remaining)}
            </span>
            {emi.penaltyAccrued > 0 && (
              <span className="ml-2 text-red-600 dark:text-red-400">
                (late fees {formatCurrency(emi.penaltyAccrued)})
              </span>
            )}
          </div>
        )}
      </div>

      <div className="p-6 space-y-6">
        {error && (
          <div className="flex items-start gap-2 p-3 rounded-lg border border-red-200 bg-red-50 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-300 text-sm">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {!hasActivePlan && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Choose a plan for your outstanding balance, preview the schedule, then subscribe.
            </p>
            <div className="grid sm:grid-cols-3 gap-3">
              {PLAN_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    setPlanType(opt.id);
                    setPreview(null);
                  }}
                  className={`text-left p-4 rounded-lg border transition-colors ${
                    planType === opt.id
                      ? "border-teal-500 bg-teal-50 dark:bg-teal-900/20 dark:border-teal-600"
                      : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                  }`}
                >
                  <div className="font-medium text-gray-900 dark:text-white">
                    {opt.title}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {opt.blurb}
                  </div>
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={handlePreview}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
              >
                Preview schedule
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={handleSubscribe}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-teal-600 text-white text-sm hover:bg-teal-700 disabled:opacity-50"
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Subscribe to plan
              </button>
            </div>

            {preview && (
              <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-800 text-left">
                    <tr>
                      <th className="px-4 py-2 font-medium">#</th>
                      <th className="px-4 py-2 font-medium">Due</th>
                      <th className="px-4 py-2 font-medium">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((row) => (
                      <tr
                        key={row.sequence}
                        className="border-t border-gray-100 dark:border-gray-800"
                      >
                        <td className="px-4 py-2">{row.sequence}</td>
                        <td className="px-4 py-2">{formatDate(row.dueDate)}</td>
                        <td className="px-4 py-2">{formatCurrency(row.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {hasActivePlan && (
          <div className="space-y-3">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Active plan:{" "}
              <span className="font-medium text-gray-900 dark:text-white">
                {emi?.emiPlan?.planType?.replace("_", "-")}
              </span>
              {" · "}
              Grace period {emi?.emiPlan?.gracePeriodDays ?? 7} days before late fees
            </p>
            <ul className="space-y-2">
              {activeSlots.map((slot) => {
                const payable = slot.amount + (slot.lateFee || 0);
                const canPay =
                  slot.status === "due" ||
                  slot.status === "overdue" ||
                  slot.status === "upcoming";
                return (
                  <li
                    key={slot._id}
                    className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-lg border ${
                      statusStyles[slot.status] || statusStyles.upcoming
                    }`}
                  >
                    <div>
                      <div className="font-medium flex items-center gap-2">
                        EMI #{slot.sequence}
                        <span className="text-xs uppercase tracking-wide opacity-80">
                          {slot.status}
                        </span>
                      </div>
                      <div className="text-sm mt-1 opacity-90">
                        Due {formatDate(slot.dueDate)} · {formatCurrency(slot.amount)}
                        {slot.lateFee ? ` + late ${formatCurrency(slot.lateFee)}` : ""}
                      </div>
                      {slot.status === "paid" && slot.receiptNumber && (
                        <div className="text-xs mt-1 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Receipt {slot.receiptNumber}
                        </div>
                      )}
                    </div>
                    {canPay && slot.status !== "paid" && (
                      <button
                        type="button"
                        onClick={() => setCheckoutSlot(slot)}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-teal-700 text-white text-sm hover:bg-teal-800 shrink-0"
                      >
                        <CreditCard className="w-4 h-4" />
                        Pay {formatCurrency(payable)}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>

      {checkoutSlot && emi && (
        <PaymentCheckoutModal
          feeId={emi.feeId}
          slot={checkoutSlot}
          defaultProvider={emi.defaultProvider || "demo"}
          onClose={() => setCheckoutSlot(null)}
          onSuccess={() => {
            setCheckoutSlot(null);
            load();
            onPaymentComplete?.();
          }}
        />
      )}
    </div>
  );
}
