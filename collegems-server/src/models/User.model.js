import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },

    email: { type: String, unique: true, required: true },

    password: { type: String, required: true },

    role: {
      type: String,
      enum: ["student", "teacher", "admin", "hod"],
      required: true
    },

    studentId: { type: String, unique: true, sparse: true },
    teacherId: { type: String, unique: true, sparse: true },
    departmentCode: { type: String },

    isVerified: { type: Boolean, default: false }
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);
