import mongoose from "mongoose";

const feeSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  total: Number,
  paid: { type: Number, default: 0 },
  installments: [
    {
      amount: Number,
      paidOn: Date,
    },
  ],
  dueDate: Date,
});
export default mongoose.model("Fee", feeSchema);
