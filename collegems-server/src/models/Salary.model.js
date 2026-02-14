import mongoose from "mongoose";

const installmentSchema = new mongoose.Schema(
  {
    amount: { type: Number, required: true, min: 0 },
    paidOn: { type: Date, default: Date.now },
  },
  { _id: false },
);

const salarySchema = new mongoose.Schema(
  {
    staff: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    total: { type: Number, required: true, min: 0 },
    paid: { type: Number, default: 0, min: 0 },
    installments: [installmentSchema],
    dueDate: { type: Date, required: true },
    status: {
      type: String,
      enum: ["Pending", "Partial", "Paid", "Overdue"],
      default: "Pending",
    },
  },
  { timestamps: true },
);

// Virtual for remaining amount
salarySchema.virtual("remaining").get(function () {
  return this.total - this.paid;
});

// Auto update status before save
salarySchema.pre("save", async function () {
  if (this.paid >= this.total) this.status = "Paid";
  else if (this.paid > 0) this.status = "Partial";
  else if (this.dueDate < new Date()) this.status = "Overdue";
  else this.status = "Pending";
});

export default mongoose.model("Salary", salarySchema);
