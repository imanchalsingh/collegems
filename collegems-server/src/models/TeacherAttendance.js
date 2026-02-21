import mongoose from "mongoose";

const TeacherAttendanceSchema = new mongoose.Schema(
  {
    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Teacher",
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ["Present", "Absent", "Late"],
      required: true,
    },
  },
  { timestamps: true },
);

const TeacherAttendance = mongoose.model(
  "TeacherAttendance",
  TeacherAttendanceSchema,
);

export default TeacherAttendance;
