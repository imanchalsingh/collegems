import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ["student", "teacher", "hod"], required: true },

  // Student-specific fields
  studentId: { type: String },
  semester: {
    type: String,
    required: function () {
      return this.role === "student";
    },
  },
  course: {
    type: String,
    required: function () {
      return this.role === "student";
    },
  },

  // Teacher-specific
  teacherId: { type: String },
  department: {
    type: String,
    required: function () {
      return this.role === "teacher";
    },
  },

  // HOD-specific
  departmentCode: { type: String },
});

export default mongoose.model("User", userSchema);
