import crypto from "crypto";
import Fee from "../models/Fee.model.js";
import User from "../models/User.model.js";
import { AppError, asyncHandler } from "../middlewares/errorHandler.middleware.js";
import { logAction } from "../utils/auditService.js";
import log from "../utils/logger.js";
import {
  PLAN_TYPES,
  calculateEmiSchedule,
  calculateOverduePenalty,
  planLabel,
} from "../utils/feeEmi.util.js";
import {
  createPaymentOrder,
  getDefaultProvider,
  verifyRazorpayPaymentSignature,
} from "../services/paymentGateway.service.js";
import { sendEmail } from "../utils/email.js";

const computeFeeStatus = (paid, total, dueDate, penaltyAccrued = 0) => {
  const outstanding = total + penaltyAccrued;
  if (paid >= outstanding) return "Paid";
  if (new Date(dueDate) < new Date()) return "Overdue";
  if (paid > 0) return "Partial";
  return "Pending";
};

async function resolveStudentId(req) {
  let studentId = req.user.id;
  if (req.user.role === "parent") {
    const parentUser = await User.findById(req.user.id);
    if (!parentUser || !parentUser.studentId) {
      throw new AppError("No child linked to this parent account", 400, "NO_CHILD_LINKED");
    }
    const studentUser = await User.findOne({
      studentId: parentUser.studentId,
      role: "student",
    });
    if (!studentUser) {
      throw new AppError("Linked student not found", 404, "NOT_FOUND");
    }
    studentId = studentUser._id;
  }
  return studentId;
}

function refreshScheduledStatuses(fee, asOf = new Date()) {
  if (!fee.scheduledInstallments?.length) return;
  const today = new Date(asOf);
  today.setHours(0, 0, 0, 0);
  const grace = fee.emiPlan?.gracePeriodDays ?? 7;

  for (const slot of fee.scheduledInstallments) {
    if (slot.status === "paid" || slot.status === "cancelled") continue;
    const due = new Date(slot.dueDate);
    due.setHours(0, 0, 0, 0);
    if (today > due) {
      const { penalty } = calculateOverduePenalty({
        installmentAmount: slot.amount,
        dueDate: slot.dueDate,
        gracePeriodDays: grace,
        dailyPercent: fee.emiPlan?.lateFeeDailyPercent ?? 2,
        maxPercent: fee.emiPlan?.lateFeeMaxPercent ?? 20,
        asOf: today,
      });
      slot.lateFee = penalty;
      slot.status = "overdue";
    } else if (today.getTime() === due.getTime()) {
      slot.status = "due";
    } else {
      slot.status = "upcoming";
    }
  }
}

/**
 * Apply a successful gateway payment to the fee ledger (idempotent by orderId / paymentId).
 */
export async function reconcileGatewayPayment({
  feeId,
  scheduledInstallmentId,
  amount,
  provider,
  gatewayOrderId,
  gatewayPaymentId,
  idempotencyKey,
}) {
  const fee = await Fee.findById(feeId);
  if (!fee) {
    throw new AppError("Fee record not found", 404, "NOT_FOUND");
  }

  const already =
    fee.installments.some(
      (i) =>
        (gatewayPaymentId && i.gatewayPaymentId === gatewayPaymentId) ||
        (idempotencyKey && i.idempotencyKey === idempotencyKey) ||
        (gatewayOrderId &&
          i.gatewayOrderId === gatewayOrderId &&
          i.status === "confirmed")
    ) ||
    fee.scheduledInstallments.some(
      (s) =>
        s.status === "paid" &&
        ((gatewayPaymentId && s.gatewayPaymentId === gatewayPaymentId) ||
          (gatewayOrderId && s.gatewayOrderId === gatewayOrderId))
    );

  if (already) {
    return { fee, duplicate: true };
  }

  let slot = null;
  if (scheduledInstallmentId) {
    slot = fee.scheduledInstallments.id(scheduledInstallmentId);
    if (!slot) {
      throw new AppError("Scheduled installment not found", 404, "NOT_FOUND");
    }
    if (slot.status === "paid") {
      return { fee, duplicate: true };
    }
  }

  const lateFee = slot?.lateFee || 0;
  const creditAmount = Number(amount);
  const receiptNumber = `RCP-${Date.now()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;

  if (slot) {
    slot.status = "paid";
    slot.paidOn = new Date();
    slot.gatewayOrderId = gatewayOrderId;
    slot.gatewayPaymentId = gatewayPaymentId;
    slot.provider = provider;
    slot.receiptNumber = receiptNumber;
    slot.idempotencyKey = idempotencyKey || slot.idempotencyKey;
  }

  fee.paid += creditAmount;
  fee.installments.push({
    amount: creditAmount,
    paidOn: new Date(),
    idempotencyKey: idempotencyKey || `gw_${gatewayPaymentId || gatewayOrderId}`,
    status: "confirmed",
    confirmedAt: new Date(),
    provider,
    gatewayOrderId,
    gatewayPaymentId,
    receiptNumber,
    scheduledInstallmentId: slot?._id,
  });

  // If late fee was included in the charged amount beyond principal, keep penaltyAccrued aligned
  if (lateFee > 0 && creditAmount >= slot.amount + lateFee) {
    // late fee portion already in paid; no extra accrual needed
  }

  fee.status = computeFeeStatus(
    fee.paid,
    fee.total,
    fee.dueDate,
    fee.penaltyAccrued
  );
  await fee.save();

  // Best-effort receipt email
  try {
    const student = await User.findById(fee.student);
    if (student?.email) {
      await sendEmail(
        student.email,
        `Fee payment receipt ${receiptNumber}`,
        `Payment of ₹${creditAmount} received. Receipt: ${receiptNumber}. Provider: ${provider}.`,
        `<p>Dear ${student.name},</p>
          <p>Your fee payment of <strong>₹${creditAmount}</strong> was confirmed.</p>
          <p>Receipt: <strong>${receiptNumber}</strong><br/>Gateway: ${provider}<br/>Order: ${gatewayOrderId || "—"}</p>
          <p>Thank you,<br/>College Finance</p>`
      );
    }
  } catch (err) {
    log.warn("Receipt email failed after payment reconcile", { err: err.message });
  }

  return { fee, duplicate: false, receiptNumber };
}

export const previewEmiPlan = asyncHandler(async (req, res) => {
  const { planType, startDate } = req.body;
  if (!PLAN_TYPES.includes(planType)) {
    throw new AppError(
      `planType must be one of: ${PLAN_TYPES.join(", ")}`,
      400,
      "INVALID_PLAN"
    );
  }

  const studentId = await resolveStudentId(req);
  const fee = await Fee.findOne({ student: studentId });
  if (!fee) throw new AppError("No fee record found", 404, "NOT_FOUND");

  const remaining = Math.max(0, fee.total + (fee.penaltyAccrued || 0) - fee.paid);
  if (remaining <= 0) {
    throw new AppError("Fee is already fully paid", 400, "ALREADY_PAID");
  }

  const schedule = calculateEmiSchedule({
    remainingAmount: remaining,
    planType,
    startDate: startDate ? new Date(startDate) : new Date(),
  });

  res.json({
    success: true,
    data: {
      remaining,
      label: planLabel(planType),
      ...schedule,
    },
  });
});

export const subscribeEmiPlan = asyncHandler(async (req, res) => {
  const { planType, startDate, gracePeriodDays } = req.body;
  if (!PLAN_TYPES.includes(planType)) {
    throw new AppError(
      `planType must be one of: ${PLAN_TYPES.join(", ")}`,
      400,
      "INVALID_PLAN"
    );
  }

  const studentId = await resolveStudentId(req);
  const fee = await Fee.findOne({ student: studentId });
  if (!fee) throw new AppError("No fee record found", 404, "NOT_FOUND");

  const hasOpenSlots = fee.scheduledInstallments?.some(
    (s) => s.status !== "paid" && s.status !== "cancelled"
  );
  if (fee.emiPlan?.active && hasOpenSlots) {
    throw new AppError(
      "An active EMI plan already exists. Cancel open installments before resubscribing.",
      409,
      "EMI_ACTIVE"
    );
  }

  const remaining = Math.max(0, fee.total + (fee.penaltyAccrued || 0) - fee.paid);
  if (remaining <= 0) {
    throw new AppError("Fee is already fully paid", 400, "ALREADY_PAID");
  }

  const start = startDate ? new Date(startDate) : new Date();
  const schedule = calculateEmiSchedule({
    remainingAmount: remaining,
    planType,
    startDate: start,
  });

  // Cancel any leftover unpaid slots from a previous plan
  for (const slot of fee.scheduledInstallments || []) {
    if (slot.status !== "paid") slot.status = "cancelled";
  }

  fee.emiPlan = {
    planType,
    subscribedAt: new Date(),
    startDate: start,
    gracePeriodDays:
      gracePeriodDays != null ? Number(gracePeriodDays) : 7,
    lateFeeDailyPercent: 2,
    lateFeeMaxPercent: 20,
    active: true,
  };

  fee.scheduledInstallments.push(
    ...schedule.installments.map((row) => ({
      sequence: row.sequence,
      amount: row.amount,
      dueDate: row.dueDate,
      status: "upcoming",
      lateFee: 0,
      reminderSentForDays: [],
    }))
  );

  // Align master due date with first EMI for reminder cron compatibility
  fee.dueDate = schedule.installments[0].dueDate;
  refreshScheduledStatuses(fee);
  await fee.save();

  await logAction(req.user.id, "SUBSCRIBE_FEE_EMI", "Fee", fee._id, {
    planType,
    count: schedule.count,
  });

  log.info(`EMI plan subscribed: ${planType}`, { feeId: fee._id, studentId });
  res.status(201).json({
    success: true,
    message: `Subscribed to ${planLabel(planType)} EMI plan`,
    data: fee,
  });
});

export const getMyEmiPlan = asyncHandler(async (req, res) => {
  const studentId = await resolveStudentId(req);
  const fee = await Fee.findOne({ student: studentId });
  if (!fee) throw new AppError("No fee record found", 404, "NOT_FOUND");

  refreshScheduledStatuses(fee);
  const accrued = fee.scheduledInstallments
    .filter((s) => s.status === "overdue")
    .reduce((sum, s) => sum + (s.lateFee || 0), 0);
  fee.penaltyAccrued = accrued;
  fee.markModified("scheduledInstallments");
  await fee.save();

  res.json({
    success: true,
    data: {
      feeId: fee._id,
      total: fee.total,
      paid: fee.paid,
      remaining: Math.max(0, fee.total + (fee.penaltyAccrued || 0) - fee.paid),
      penaltyAccrued: fee.penaltyAccrued || 0,
      status: fee.status,
      emiPlan: fee.emiPlan || null,
      scheduledInstallments: fee.scheduledInstallments,
      defaultProvider: getDefaultProvider(),
    },
  });
});

export const createCheckoutOrder = asyncHandler(async (req, res) => {
  const {
    scheduledInstallmentId,
    amount,
    provider,
    idempotencyKey,
  } = req.body;

  if (!idempotencyKey || typeof idempotencyKey !== "string") {
    throw new AppError("idempotencyKey is required", 400, "MISSING_IDEMPOTENCY_KEY");
  }

  const studentId = await resolveStudentId(req);
  const fee = await Fee.findOne({ student: studentId });
  if (!fee) throw new AppError("No fee record found", 404, "NOT_FOUND");

  refreshScheduledStatuses(fee);

  let slot = null;
  let chargeAmount = Number(amount);

  if (scheduledInstallmentId) {
    slot = fee.scheduledInstallments.id(scheduledInstallmentId);
    if (!slot) {
      throw new AppError("Scheduled installment not found", 404, "NOT_FOUND");
    }
    if (slot.status === "paid" || slot.status === "cancelled") {
      throw new AppError("This installment cannot be paid", 400, "INVALID_SLOT");
    }
    chargeAmount = slot.amount + (slot.lateFee || 0);
  }

  if (!chargeAmount || chargeAmount <= 0) {
    throw new AppError("Valid amount is required", 400, "INVALID_AMOUNT");
  }

  const remaining = Math.max(0, fee.total + (fee.penaltyAccrued || 0) - fee.paid);
  if (chargeAmount > remaining + (slot?.lateFee || 0) + 1) {
    // allow late fee on top of remaining principal
    throw new AppError(
      `Amount exceeds outstanding balance of ₹${remaining}`,
      400,
      "OVERPAYMENT"
    );
  }

  const order = await createPaymentOrder({
    provider,
    amount: chargeAmount,
    receipt: `fee_${fee._id}_${Date.now()}`,
    notes: {
      feeId: String(fee._id),
      studentId: String(studentId),
      scheduledInstallmentId: scheduledInstallmentId
        ? String(scheduledInstallmentId)
        : "",
      idempotencyKey,
    },
    description: slot
      ? `EMI #${slot.sequence} fee payment`
      : "College fee payment",
  });

  if (slot) {
    slot.gatewayOrderId = order.orderId;
    slot.provider = order.provider;
    slot.idempotencyKey = idempotencyKey;
    await fee.save();
  }

  res.status(201).json({
    success: true,
    data: {
      ...order,
      feeId: fee._id,
      scheduledInstallmentId: slot?._id || null,
      chargeAmount,
      lateFee: slot?.lateFee || 0,
      idempotencyKey,
    },
  });
});

export const confirmCheckoutPayment = asyncHandler(async (req, res) => {
  const {
    provider,
    orderId,
    paymentId,
    signature,
    feeId,
    scheduledInstallmentId,
    amount,
    idempotencyKey,
  } = req.body;

  if (!orderId || !feeId) {
    throw new AppError("orderId and feeId are required", 400, "MISSING_FIELDS");
  }

  const studentId = await resolveStudentId(req);
  const fee = await Fee.findOne({ _id: feeId, student: studentId });
  if (!fee) throw new AppError("Fee record not found", 404, "NOT_FOUND");

  const chosen = (provider || "demo").toLowerCase();

  if (chosen === "razorpay") {
    if (!paymentId || !signature) {
      throw new AppError(
        "paymentId and signature are required for Razorpay",
        400,
        "MISSING_SIGNATURE"
      );
    }
    const ok = verifyRazorpayPaymentSignature({
      orderId,
      paymentId,
      signature,
    });
    if (!ok) {
      throw new AppError("Invalid payment signature", 400, "INVALID_SIGNATURE");
    }
  }

  // Stripe / demo: trust client confirm only when order matches a pending slot
  // (webhooks remain source of truth for production Stripe)
  if (chosen === "demo" || chosen === "stripe" || chosen === "razorpay") {
    let chargeAmount = Number(amount);
    if (scheduledInstallmentId) {
      const slot = fee.scheduledInstallments.id(scheduledInstallmentId);
      if (slot) chargeAmount = slot.amount + (slot.lateFee || 0);
    }
    if (!chargeAmount || chargeAmount <= 0) {
      throw new AppError("Valid amount is required", 400, "INVALID_AMOUNT");
    }

    const result = await reconcileGatewayPayment({
      feeId: fee._id,
      scheduledInstallmentId,
      amount: chargeAmount,
      provider: chosen,
      gatewayOrderId: orderId,
      gatewayPaymentId: paymentId || `confirmed_${orderId}`,
      idempotencyKey,
    });

    await logAction(req.user.id, "CONFIRM_GATEWAY_PAYMENT", "Fee", fee._id, {
      provider: chosen,
      orderId,
      amount: chargeAmount,
    });

    return res.json({
      success: true,
      message: result.duplicate
        ? "Payment already reconciled"
        : "Payment confirmed",
      data: result.fee,
      receiptNumber: result.receiptNumber || null,
      duplicate: result.duplicate,
    });
  }

  throw new AppError("Unsupported provider", 400, "INVALID_PROVIDER");
});
