import express from "express";
import { protect } from "../middlewares/auth.middleware.js";
import { allowRoles } from "../middlewares/role.middleware.js";
import { asyncHandler, AppError } from "../middlewares/errorHandler.middleware.js";
import log from "../utils/logger.js";
import Fee from "../models/Fee.model.js";
import User from "../models/User.model.js";
import { logAction } from "../utils/auditService.js";
const router = express.Router();

// Set fee for student
router.post(
  "/set",
  protect,
  allowRoles("hod"),
  asyncHandler(async (req, res) => {
    const { student, total, dueDate } = req.body;

    log.request("POST", "/api/fee/set", req.user?.id);

    if (!student || !total || !dueDate) {
      throw new AppError(
        "Student, total amount and due date are required",
        400,
        "MISSING_FIELDS"
      );
    }

    if (total <= 0) {
      throw new AppError("Total amount must be greater than 0", 400, "INVALID_AMOUNT");
    }

    const existingFee = await Fee.findOne({ student });
    if (existingFee) {
      throw new AppError("Fee already exists for this student", 409, "DUPLICATE_FEE");
    }

    const fee = await Fee.create({
      student,
      total,
      dueDate,
    });

    log.info(`Fee set for student: ${student}`, { feeId: fee._id, total });
    res.status(201).json({ success: true, data: fee });
  })
);

const computeFeeStatus = (paid, total, dueDate) => {
  if (paid >= total) return "Paid";
  if (new Date(dueDate) < new Date()) return "Overdue";
  if (paid > 0) return "Partial";
  return "Pending";
};

// installment pay
router.post("/pay", protect, allowRoles("student", "parent"), asyncHandler(async (req, res) => {
  const { amount, idempotencyKey } = req.body;
  if (!amount || amount <= 0) {
    throw new AppError("Valid amount is required", 400, "INVALID_AMOUNT");
  }
  if (!idempotencyKey || typeof idempotencyKey !== "string") {
    throw new AppError("idempotencyKey is required", 400, "MISSING_IDEMPOTENCY_KEY");
  }

  let studentId = req.user.id;
  if (req.user.role === "parent") {
    const parentUser = await User.findById(req.user.id);
    if (!parentUser || !parentUser.studentId) {
      throw new AppError("No child linked to this parent account", 400, "NO_CHILD_LINKED");
    }
    const studentUser = await User.findOne({ studentId: parentUser.studentId, role: "student" });
    if (!studentUser) {
      throw new AppError("Linked student not found", 404, "NOT_FOUND");
    }
    studentId = studentUser._id;
  }

  // Atomically apply the payment: only matches (and increments) if this exact
  // idempotency key hasn't already been applied, and the payment won't overpay.
  let fee = await Fee.findOneAndUpdate(
    {
      student: studentId,
      "installments.idempotencyKey": { $ne: idempotencyKey },
      $expr: { $lte: [{ $add: ["$paid", amount] }, "$total"] },
    },
    {
      $inc: { paid: amount },
      $push: { installments: { amount, idempotencyKey, paidOn: new Date() } },
    },
    { new: true },
  );

  if (!fee) {
    const existing = await Fee.findOne({ student: studentId });
    if (!existing) {
      throw new AppError("Fee record not found", 404, "NOT_FOUND");
    }
    const alreadyApplied = existing.installments.some((i) => i.idempotencyKey === idempotencyKey);
    if (alreadyApplied) {
      log.info(`Duplicate payment submission ignored: ${idempotencyKey}`, { studentId, feeId: existing._id });
      return res.json({
        success: true,
        message: "Payment already processed",
        data: existing,
      });
    }
    throw new AppError(
      `Amount exceeds outstanding balance of ${existing.total - existing.paid}`,
      400,
      "OVERPAYMENT",
    );
  }

  const status = computeFeeStatus(fee.paid, fee.total, fee.dueDate);
  if (fee.status !== status) {
    fee = await Fee.findByIdAndUpdate(fee._id, { $set: { status } }, { new: true });
  }

  await logAction(req.user.id, "REQUEST_FEE_PAYMENT", "Fee", fee._id, { studentId, amount });

  log.info(`Payment claim submitted: ${amount}`, { studentId, feeId: fee._id });
  res.json({
    success: true,
    message: "Payment submitted and is pending confirmation by the finance team",
    data: fee,
  });
}));

// List every fee with at least one payment awaiting confirmation.
router.get(
  "/pending",
  protect,
  allowRoles("hod"),
  asyncHandler(async (req, res) => {
    const fees = await Fee.find({ "installments.status": "pending" })
      .populate("student", "name email studentId")
      .populate("installments.requestedBy", "name email");
    res.json({ success: true, data: fees });
  })
);

// Confirm a pending payment claim: only now does it count toward the balance.
router.post(
  "/installments/:feeId/:installmentId/confirm",
  protect,
  allowRoles("hod"),
  asyncHandler(async (req, res) => {
    const { feeId, installmentId } = req.params;
    const fee = await Fee.findById(feeId);
    if (!fee) {
      throw new AppError("Fee record not found", 404, "NOT_FOUND");
    }

    const installment = fee.installments.id(installmentId);
    if (!installment) {
      throw new AppError("Payment not found", 404, "NOT_FOUND");
    }
    if (installment.status !== "pending") {
      throw new AppError("This payment has already been reviewed", 409, "ALREADY_REVIEWED");
    }

    installment.status = "confirmed";
    installment.confirmedBy = req.user.id;
    installment.confirmedAt = new Date();
    fee.paid += installment.amount;
    await fee.save();

    await logAction(req.user.id, "CONFIRM_FEE_PAYMENT", "Fee", fee._id, {
      installmentId,
      amount: installment.amount,
      studentId: fee.student,
    });

    log.info(`Payment confirmed: ${installment.amount}`, { feeId: fee._id, installmentId });
    res.json({ success: true, message: "Payment confirmed", data: fee });
  })
);

// Reject a pending payment claim (e.g. a bogus/duplicate self-report).
// No balance change - just marks it so it's no longer awaiting review.
router.post(
  "/installments/:feeId/:installmentId/reject",
  protect,
  allowRoles("hod"),
  asyncHandler(async (req, res) => {
    const { feeId, installmentId } = req.params;
    const fee = await Fee.findById(feeId);
    if (!fee) {
      throw new AppError("Fee record not found", 404, "NOT_FOUND");
    }

    const installment = fee.installments.id(installmentId);
    if (!installment) {
      throw new AppError("Payment not found", 404, "NOT_FOUND");
    }
    if (installment.status !== "pending") {
      throw new AppError("This payment has already been reviewed", 409, "ALREADY_REVIEWED");
    }

    installment.status = "rejected";
    installment.confirmedBy = req.user.id;
    installment.confirmedAt = new Date();
    await fee.save();

    await logAction(req.user.id, "REJECT_FEE_PAYMENT", "Fee", fee._id, {
      installmentId,
      amount: installment.amount,
      studentId: fee.student,
    });

    log.info(`Payment rejected`, { feeId: fee._id, installmentId });
    res.json({ success: true, message: "Payment rejected", data: fee });
  })
);

router.get("/me", protect, allowRoles("student", "parent"), asyncHandler(async (req, res) => {
  let studentId = req.user.id;
  if (req.user.role === "parent") {
    const parentUser = await User.findById(req.user.id);
    if (!parentUser || !parentUser.studentId) {
      throw new AppError("No child linked to this parent account", 400, "NO_CHILD_LINKED");
    }
    const studentUser = await User.findOne({ studentId: parentUser.studentId, role: "student" });
    if (!studentUser) {
      throw new AppError("Linked student not found", 404, "NOT_FOUND");
    }
    studentId = studentUser._id;
  }

  const fee = await Fee.findOne({ student: studentId });
  if (!fee) {
    throw new AppError("No fee record found", 404, "NOT_FOUND");
  }

  res.json({ success: true, data: fee });
}));

// View all student fees
router.get(
  "/all",
  protect,
  allowRoles("teacher", "hod"),
  asyncHandler(async (req, res) => {
    log.request("GET", "/api/fee/all", req.user?.id);
    const fees = await Fee.find().populate("student", "name email");
    res.json({ success: true, data: fees });
  })
);

export default router;
