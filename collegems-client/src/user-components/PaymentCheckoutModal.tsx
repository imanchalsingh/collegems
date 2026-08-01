import { useRef, useState } from "react";
import { Download, Loader2, X } from "lucide-react";
import { jsPDF } from "jspdf";
import api from "../api/axios";

interface Slot {
  _id: string;
  sequence: number;
  amount: number;
  lateFee?: number;
  dueDate: string;
}

interface OrderResponse {
  provider: "razorpay" | "stripe" | "demo";
  orderId: string;
  amount: number;
  currency: string;
  keyId?: string;
  clientSecret?: string;
  publishableKey?: string | null;
  mode: string;
  feeId: string;
  scheduledInstallmentId: string | null;
  chargeAmount: number;
  lateFee: number;
  idempotencyKey: string;
  message?: string;
}

interface Props {
  feeId: string;
  slot: Slot;
  defaultProvider: string;
  onClose: () => void;
  onSuccess: () => void;
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
  }).format(amount);

function downloadReceiptPdf(opts: {
  receiptNumber: string;
  amount: number;
  provider: string;
  orderId: string;
  sequence: number;
}) {
  const doc = new jsPDF();
  doc.setFontSize(18);
  doc.text("College Fee Payment Receipt", 20, 24);
  doc.setFontSize(11);
  doc.text(`Receipt: ${opts.receiptNumber}`, 20, 40);
  doc.text(`EMI sequence: #${opts.sequence}`, 20, 48);
  doc.text(`Amount paid: ${formatCurrency(opts.amount)}`, 20, 56);
  doc.text(`Gateway: ${opts.provider}`, 20, 64);
  doc.text(`Order ID: ${opts.orderId}`, 20, 72);
  doc.text(`Date: ${new Date().toLocaleString("en-IN")}`, 20, 80);
  doc.text("This is a system-generated receipt.", 20, 96);
  doc.save(`${opts.receiptNumber}.pdf`);
}

export default function PaymentCheckoutModal({
  feeId,
  slot,
  defaultProvider,
  onClose,
  onSuccess,
}: Props) {
  const [provider, setProvider] = useState(
    ["razorpay", "stripe", "demo"].includes(defaultProvider)
      ? defaultProvider
      : "demo"
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<OrderResponse | null>(null);
  const [receiptNumber, setReceiptNumber] = useState<string | null>(null);
  const idempotencyKeyRef = useRef(crypto.randomUUID());

  const charge = slot.amount + (slot.lateFee || 0);

  const createOrder = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await api.post<{ data: OrderResponse }>(
        "/fee/payments/create-order",
        {
          scheduledInstallmentId: slot._id,
          provider,
          idempotencyKey: idempotencyKeyRef.current,
        }
      );
      setOrder(res.data.data);
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Could not create payment order"
      );
    } finally {
      setBusy(false);
    }
  };

  const confirmPayment = async (extra?: {
    paymentId?: string;
    signature?: string;
  }) => {
    if (!order) return;
    setBusy(true);
    setError(null);
    try {
      const res = await api.post<{
        data: unknown;
        receiptNumber?: string | null;
        message?: string;
      }>("/fee/payments/confirm", {
        provider: order.provider,
        orderId: order.orderId,
        paymentId: extra?.paymentId || `pay_${order.orderId}`,
        signature: extra?.signature,
        feeId,
        scheduledInstallmentId: slot._id,
        amount: order.chargeAmount,
        idempotencyKey: order.idempotencyKey,
      });

      const receipt =
        res.data.receiptNumber ||
        `RCP-${Date.now().toString(36).toUpperCase()}`;
      setReceiptNumber(receipt);
      downloadReceiptPdf({
        receiptNumber: receipt,
        amount: order.chargeAmount,
        provider: order.provider,
        orderId: order.orderId,
        sequence: slot.sequence,
      });
      onSuccess();
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Payment confirmation failed"
      );
    } finally {
      setBusy(false);
    }
  };

  const payWithRazorpayCheckout = async () => {
    if (!order?.keyId) {
      // Keys missing → treat as demo confirm after order creation
      await confirmPayment();
      return;
    }

    type RazorpayCtor = new (options: Record<string, unknown>) => {
      open: () => void;
    };
    const w = window as unknown as { Razorpay?: RazorpayCtor };

    const openCheckout = () => {
      if (!w.Razorpay) {
        setError("Razorpay checkout script failed to load");
        return;
      }
      const rzp = new w.Razorpay({
        key: order.keyId,
        amount: Math.round(order.chargeAmount * 100),
        currency: order.currency || "INR",
        name: "College Fee EMI",
        description: `EMI #${slot.sequence}`,
        order_id: order.orderId,
        handler: async (response: {
          razorpay_payment_id: string;
          razorpay_order_id: string;
          razorpay_signature: string;
        }) => {
          await confirmPayment({
            paymentId: response.razorpay_payment_id,
            signature: response.razorpay_signature,
          });
        },
      });
      rzp.open();
    };

    if (w.Razorpay) {
      openCheckout();
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = openCheckout;
    script.onerror = () => setError("Failed to load Razorpay checkout");
    document.body.appendChild(script);
  };

  const handlePay = async () => {
    if (!order) {
      await createOrder();
      return;
    }
    if (order.provider === "razorpay") {
      await payWithRazorpayCheckout();
      return;
    }
    // Stripe Elements would use clientSecret in production; demo/stripe confirm locally
    // when webhook is not available in the browser session.
    await confirmPayment();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="checkout-title"
        className="w-full max-w-md bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-xl"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3
            id="checkout-title"
            className="text-lg font-semibold text-gray-900 dark:text-white"
          >
            Pay EMI #{slot.sequence}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"
            aria-label="Close checkout"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
            <p>Principal: {formatCurrency(slot.amount)}</p>
            {slot.lateFee ? <p>Late fee: {formatCurrency(slot.lateFee)}</p> : null}
            <p className="text-base font-semibold text-gray-900 dark:text-white">
              Total due: {formatCurrency(charge)}
            </p>
          </div>

          {!order && (
            <label className="block text-sm">
              <span className="text-gray-600 dark:text-gray-400">Payment provider</span>
              <select
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-gray-900 dark:text-white"
              >
                <option value="demo">Demo (no API keys)</option>
                <option value="razorpay">Razorpay</option>
                <option value="stripe">Stripe</option>
              </select>
            </label>
          )}

          {order && (
            <div className="text-xs rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 p-3 text-slate-700 dark:text-slate-300 space-y-1">
              <p>
                Order: <code>{order.orderId}</code>
              </p>
              <p>
                Mode: {order.mode} · Provider: {order.provider}
              </p>
              {order.message && <p>{order.message}</p>}
            </div>
          )}

          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          )}

          {receiptNumber && (
            <p className="text-sm text-green-700 dark:text-green-400 flex items-center gap-2">
              <Download className="w-4 h-4" />
              Receipt {receiptNumber} downloaded
            </p>
          )}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={handlePay}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-teal-600 text-white text-sm hover:bg-teal-700 disabled:opacity-50"
            >
              {busy && <Loader2 className="w-4 h-4 animate-spin" />}
              {!order
                ? "Create order"
                : order.provider === "razorpay" && order.keyId
                  ? "Open Razorpay"
                  : "Confirm payment"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
