import mongoose from "mongoose";

const installmentSchema = new mongoose.Schema(
  {
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    paidOn: {
      type: Date,
      default: Date.now,
    },
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
feeSchema.pre("save", function (next) {
  if (this.paid >= this.total) {
    this.status = "Paid";
  } else if (this.paid > 0) {
    this.status = "Partial";
  } else if (this.dueDate < new Date()) {
    this.status = "Overdue";
  } else {
    this.status = "Pending";
  }
  next();
});

export default mongoose.model("Fee", feeSchema);
