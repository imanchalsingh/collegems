import mongoose from "mongoose";

const alumniDonationSchema = new mongoose.Schema(
  {
    donor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    alumniProfile: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Alumni",
    },
    amount: {
      type: Number,
      required: true,
      min: 1,
    },
    currency: {
      type: String,
      default: "INR",
    },
    fund: {
      type: String,
      enum: [
        "college_development",
        "scholarship",
        "infrastructure",
        "library",
        "general",
      ],
      default: "college_development",
    },
    message: { type: String, maxlength: 500 },
    status: {
      type: String,
      enum: ["created", "pending", "paid", "failed"],
      default: "created",
    },
    provider: {
      type: String,
      enum: ["razorpay", "demo"],
      default: "demo",
    },
    orderId: { type: String },
    paymentId: { type: String },
    paymentSignature: { type: String },
  },
  { timestamps: true }
);

alumniDonationSchema.index({ donor: 1, createdAt: -1 });
alumniDonationSchema.index({ orderId: 1 });

export default mongoose.model("AlumniDonation", alumniDonationSchema);
