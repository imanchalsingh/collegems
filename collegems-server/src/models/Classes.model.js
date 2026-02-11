import mongoose from "mongoose";

const classSchema = new mongoose.Schema({
  courseName: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  name: { type: String, required: true },
  semester: { type: Number, required: true },
  schedule: { type: String, required: true },
  teacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
});

export default mongoose.model("Class", classSchema);
