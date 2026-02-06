import mongoose from "mongoose";

const assignmentSchema = new mongoose.Schema(
  {
    title: String,
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course"
    },
    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    dueDate: Date,
    submissions: [
      {
        student: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User"
        },
        submittedAt: Date,
        marks: Number
      }
    ]
  },
  { timestamps: true }
);

export default mongoose.model("Assignment", assignmentSchema);
