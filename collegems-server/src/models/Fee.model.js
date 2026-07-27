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
  // Installments created directly by staff (e.g. via /fee/set or the seeder)
  // default to "confirmed" since there's nothing to verify.
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
});

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

    installments: [installmentSchema],

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

/* Virtual: remaining amount */
feeSchema.virtual("remaining").get(function () {
  return this.total - this.paid;
});

/* Auto update status before save */
feeSchema.pre("save", async function () {
  if (this.paid >= this.total) {
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