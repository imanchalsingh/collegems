import mongoose from "mongoose";

const libraryFineSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    issue: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BookIssue",
      required: true,
      unique: true, // One fine record per book issue
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ["Unpaid", "Paid"],
      default: "Unpaid",
    },
    paidOn: {
      type: Date,
    },
    // Adding daysOverdue can be helpful for tracking
    daysOverdue: {
      type: Number,
      required: true,
      default: 0,
    }
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("LibraryFine", libraryFineSchema);
