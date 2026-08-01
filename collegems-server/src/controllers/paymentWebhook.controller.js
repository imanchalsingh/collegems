import Fee from "../models/Fee.model.js";
import log from "../utils/logger.js";
import {
  constructStripeEvent,
  verifyRazorpayWebhookSignature,
} from "../services/paymentGateway.service.js";
import { reconcileGatewayPayment } from "./feeEmi.controller.js";

/**
 * Razorpay webhook — verify signature, then auto-reconcile payment.captured.
 * Expects raw body string on req.rawBody when available.
 */
export async function handleRazorpayWebhook(req, res) {
  try {
    const signature = req.headers["x-razorpay-signature"];
    const rawBody =
      typeof req.rawBody === "string"
        ? req.rawBody
        : Buffer.isBuffer(req.body)
          ? req.body.toString("utf8")
          : JSON.stringify(req.body || {});

    if (process.env.RAZORPAY_WEBHOOK_SECRET) {
      const ok = verifyRazorpayWebhookSignature(rawBody, signature);
      if (!ok) {
        log.warn("Razorpay webhook signature verification failed");
        return res.status(400).json({ success: false, message: "Invalid signature" });
      }
    } else if (process.env.NODE_ENV === "production") {
      return res.status(503).json({
        success: false,
        message: "RAZORPAY_WEBHOOK_SECRET not configured",
      });
    }

    const payload =
      typeof req.body === "object" && !Buffer.isBuffer(req.body)
        ? req.body
        : JSON.parse(rawBody);

    const event = payload.event;
    if (event !== "payment.captured" && event !== "order.paid") {
      return res.json({ success: true, message: `Ignored event ${event}` });
    }

    const paymentEntity =
      payload.payload?.payment?.entity || payload.payload?.order?.entity;
    if (!paymentEntity) {
      return res.status(400).json({ success: false, message: "Missing payment entity" });
    }

    const notes = paymentEntity.notes || {};
    const feeId = notes.feeId;
    const scheduledInstallmentId = notes.scheduledInstallmentId || undefined;
    const orderId = paymentEntity.order_id || paymentEntity.id;
    const paymentId = paymentEntity.id;
    const amount = (paymentEntity.amount || 0) / 100;

    if (!feeId) {
      // Fallback: look up by gatewayOrderId on scheduled installments
      const fee = await Fee.findOne({
        "scheduledInstallments.gatewayOrderId": orderId,
      });
      if (!fee) {
        log.warn("Razorpay webhook: fee not found for order", { orderId });
        return res.status(404).json({ success: false, message: "Fee not found" });
      }
      const slot = fee.scheduledInstallments.find(
        (s) => s.gatewayOrderId === orderId
      );
      await reconcileGatewayPayment({
        feeId: fee._id,
        scheduledInstallmentId: slot?._id,
        amount: slot ? slot.amount + (slot.lateFee || 0) : amount,
        provider: "razorpay",
        gatewayOrderId: orderId,
        gatewayPaymentId: paymentId,
        idempotencyKey: notes.idempotencyKey,
      });
      return res.json({ success: true, message: "Reconciled" });
    }

    await reconcileGatewayPayment({
      feeId,
      scheduledInstallmentId: scheduledInstallmentId || undefined,
      amount,
      provider: "razorpay",
      gatewayOrderId: orderId,
      gatewayPaymentId: paymentId,
      idempotencyKey: notes.idempotencyKey,
    });

    return res.json({ success: true, message: "Reconciled" });
  } catch (err) {
    log.error("Razorpay webhook error", { err: err.message });
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * Stripe webhook — verify signature, reconcile payment_intent.succeeded.
 */
export async function handleStripeWebhook(req, res) {
  try {
    const signature = req.headers["stripe-signature"];
    const rawBody = Buffer.isBuffer(req.body)
      ? req.body
      : Buffer.from(
          typeof req.rawBody === "string" ? req.rawBody : JSON.stringify(req.body || {}),
          "utf8"
        );

    let event;
    if (process.env.STRIPE_WEBHOOK_SECRET && process.env.STRIPE_SECRET_KEY) {
      event = await constructStripeEvent(rawBody, signature);
    } else if (process.env.NODE_ENV === "production") {
      return res.status(503).json({
        success: false,
        message: "Stripe webhook secrets not configured",
      });
    } else {
      event =
        typeof req.body === "object" && !Buffer.isBuffer(req.body)
          ? req.body
          : JSON.parse(rawBody.toString("utf8"));
    }

    if (event.type !== "payment_intent.succeeded") {
      return res.json({ success: true, message: `Ignored ${event.type}` });
    }

    const intent = event.data?.object || event.object;
    const metadata = intent.metadata || {};
    const feeId = metadata.feeId;
    const scheduledInstallmentId = metadata.scheduledInstallmentId || undefined;
    const amount = (intent.amount_received || intent.amount || 0) / 100;

    if (!feeId) {
      const fee = await Fee.findOne({
        "scheduledInstallments.gatewayOrderId": intent.id,
      });
      if (!fee) {
        return res.status(404).json({ success: false, message: "Fee not found" });
      }
      const slot = fee.scheduledInstallments.find(
        (s) => s.gatewayOrderId === intent.id
      );
      await reconcileGatewayPayment({
        feeId: fee._id,
        scheduledInstallmentId: slot?._id,
        amount: slot ? slot.amount + (slot.lateFee || 0) : amount,
        provider: "stripe",
        gatewayOrderId: intent.id,
        gatewayPaymentId: intent.id,
        idempotencyKey: metadata.idempotencyKey,
      });
      return res.json({ success: true, message: "Reconciled" });
    }

    await reconcileGatewayPayment({
      feeId,
      scheduledInstallmentId: scheduledInstallmentId || undefined,
      amount,
      provider: "stripe",
      gatewayOrderId: intent.id,
      gatewayPaymentId: intent.id,
      idempotencyKey: metadata.idempotencyKey,
    });

    return res.json({ success: true, message: "Reconciled" });
  } catch (err) {
    log.error("Stripe webhook error", { err: err.message });
    return res.status(400).json({ success: false, message: err.message });
  }
}
