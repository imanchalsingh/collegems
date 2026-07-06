import mongoose from "mongoose";

const examinationFormSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    studentName: {
      type: String,
      required: true,
    },
    rollNumber: {
      type: String,
      required: true,
    },
    courseDept: {
      type: String,
      required: true,
    },
    semesterYear: {
      type: String,
      required: true,
    },
    subjects: {
      type: [String],
      required: true,
    },
    examType: {
      type: String,
      enum: ["Regular", "Backlog", "Improvement", "Re-evaluation"],
      required: true,
    },
    status: {
      type: String,
      enum: ["Pending", "Approved", "Rejected"],
      default: "Pending",
    },
  },
  { timestamps: true }
);

export default mongoose.model("ExaminationForm", examinationFormSchema);
