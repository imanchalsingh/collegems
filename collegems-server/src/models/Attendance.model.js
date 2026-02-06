import mongoose from "mongoose";

const attendanceSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true
    },
    date: {
      type: String, // YYYY-MM-DD
      required: true
    },
    status: {
      type: String,
      enum: ["present", "absent"],
      required: true
    }
  },
  { timestamps: true }
);

attendanceSchema.index(
  { student: 1, course: 1, date: 1 },
  { unique: true }
);

export default mongoose.model("Attendance", attendanceSchema);
