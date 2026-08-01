import crypto from "crypto";
import log from "../utils/logger.js";

const currency = () => process.env.PAYMENT_CURRENCY || "INR";

export const getDefaultProvider = () => {
  const configured = (process.env.PAYMENT_PROVIDER || "demo").toLowerCase();
  if (["razorpay", "stripe", "demo"].includes(configured)) return configured;
  return "demo";
};

export const isRazorpayConfigured = () =>
  Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);

export const isStripeConfigured = () => Boolean(process.env.STRIPE_SECRET_KEY);

/**
 * Create a checkout order for an EMI installment (or ad-hoc fee amount).
 * Falls back to demo mode when SDK keys are missing so local OSS demos work.
 */
export async function createPaymentOrder({
  provider,
  amount,
  receipt,
  notes = {},
  description = "College fee installment",
}) {
  const chosen = (provider || getDefaultProvider()).toLowerCase();
  const amountPaise = Math.round(Number(amount) * 100);

  if (chosen === "razorpay" && isRazorpayConfigured()) {
    const Razorpay = (await import("razorpay")).default;
    const client = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
    const order = await client.orders.create({
      amount: amountPaise,
      currency: currency(),
      receipt: String(receipt).slice(0, 40),
      notes,
    });
    return {
      provider: "razorpay",
      orderId: order.id,
      amount: Number(amount),
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
      mode: "live",
    };
  }

  if (chosen === "stripe" && isStripeConfigured()) {
    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const intent = await stripe.paymentIntents.create({
      amount: amountPaise,
      currency: currency().toLowerCase(),
      description,
      metadata: Object.fromEntries(
        Object.entries(notes).map(([k, v]) => [k, String(v)])
      ),
      automatic_payment_methods: { enabled: true },
    });
    return {
      provider: "stripe",
      orderId: intent.id,
      clientSecret: intent.client_secret,
      amount: Number(amount),
      currency: intent.currency?.toUpperCase() || currency(),
      publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || null,
      mode: "live",
    };
  }

  // Demo checkout — no external gateway required
  const orderId = `demo_order_${crypto.randomBytes(8).toString("hex")}`;
  log.info("Created demo payment order (gateway keys not configured)", {
    orderId,
    amount,
    requestedProvider: chosen,
  });
  return {
    provider: "demo",
    orderId,
    amount: Number(amount),
    currency: currency(),
    mode: "demo",
    message:
      "Demo checkout: confirm locally. Configure Razorpay/Stripe keys for live payments.",
  };
}

export function verifyRazorpayPaymentSignature({
  orderId,
  paymentId,
  signature,
}) {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) return false;
  const body = `${orderId}|${paymentId}`;
  const expected = crypto.createHmac("sha256", secret).update(body).digest("hex");
  return expected === signature;
}

export function verifyRazorpayWebhookSignature(rawBody, signature) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret || !signature) return false;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");
  return expected === signature;
}

export async function constructStripeEvent(rawBody, signature) {
  if (!isStripeConfigured()) {
    throw new Error("Stripe is not configured");
  }
  const Stripe = (await import("stripe")).default;
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  return stripe.webhooks.constructEvent(
    rawBody,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET
  );
}
