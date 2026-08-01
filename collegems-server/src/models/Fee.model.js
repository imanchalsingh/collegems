import mongoose from "mongoose";

const installmentSchema = new mongoose.Schema({
  amount: {
    type: Number,
    required: true,
    min: 0,
  },
  paidOn: {
    type: Date,
    default: Date.now,
  },
  idempotencyKey: {
    type: String,
  },
  // Payments submitted by a student/parent start as "pending" and only
  // count toward `paid` once a staff member (hod) confirms them - see
  // POST /api/fee/pay vs POST /api/fee/installments/:feeId/:installmentId/confirm.
  // Gateway-confirmed EMI payments are marked "confirmed" immediately.
  status: {
    type: String,
    enum: ["pending", "confirmed", "rejected"],
    default: "confirmed",
  },
  requestedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  confirmedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  confirmedAt: {
    type: Date,
  },
  provider: {
    type: String,
    enum: ["manual", "razorpay", "stripe", "demo"],
    default: "manual",
  },
  gatewayOrderId: String,
  gatewayPaymentId: String,
  receiptNumber: String,
  scheduledInstallmentId: {
    type: mongoose.Schema.Types.ObjectId,
  },
});

const scheduledInstallmentSchema = new mongoose.Schema({
  sequence: { type: Number, required: true, min: 1 },
  amount: { type: Number, required: true, min: 0 },
  dueDate: { type: Date, required: true },
  status: {
    type: String,
    enum: ["upcoming", "due", "paid", "overdue", "cancelled"],
    default: "upcoming",
  },
  paidOn: Date,
  lateFee: { type: Number, default: 0, min: 0 },
  reminderSentForDays: { type: [Number], default: [] },
  gatewayOrderId: String,
  gatewayPaymentId: String,
  provider: {
    type: String,
    enum: ["razorpay", "stripe", "demo"],
  },
  receiptNumber: String,
  idempotencyKey: String,
});

const emiPlanSchema = new mongoose.Schema(
  {
    planType: {
      type: String,
      enum: ["2_stage", "4_stage", "monthly"],
      required: true,
    },
    subscribedAt: { type: Date, default: Date.now },
    startDate: { type: Date, required: true },
    gracePeriodDays: { type: Number, default: 7, min: 0 },
    lateFeeDailyPercent: { type: Number, default: 2, min: 0 },
    lateFeeMaxPercent: { type: Number, default: 20, min: 0 },
    active: { type: Boolean, default: true },
  },
  { _id: false }
);

const feeSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    total: {
      type: Number,
      required: true,
      min: 0,
    },

    paid: {
      type: Number,
      default: 0,
      min: 0,
    },

    /** Accrued late penalties across EMI slots (added on top of outstanding). */
    penaltyAccrued: {
      type: Number,
      default: 0,
      min: 0,
    },

    installments: [installmentSchema],

    emiPlan: emiPlanSchema,

    scheduledInstallments: [scheduledInstallmentSchema],

    dueDate: {
      type: Date,
      required: true,
    },

    status: {
      type: String,
      enum: ["Pending", "Partial", "Paid", "Overdue"],
      default: "Pending",
    },
  },
  {
    timestamps: true,
  }
);

/* Virtual: remaining amount (principal + accrued penalty - paid) */
feeSchema.virtual("remaining").get(function () {
  return Math.max(0, this.total + (this.penaltyAccrued || 0) - this.paid);
});

/* Auto update status before save */
feeSchema.pre("save", async function () {
  const outstanding = this.total + (this.penaltyAccrued || 0);
  if (this.paid >= outstanding) {
    this.status = "Paid";
  } else if (this.dueDate < new Date()) {
    this.status = "Overdue";
  } else if (this.paid > 0) {
    this.status = "Partial";
  } else {
    this.status = "Pending";
  }
});

export default mongoose.model("Fee", feeSchema);
