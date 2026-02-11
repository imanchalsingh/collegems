import mongoose from "mongoose";

const classSchema = new mongoose.Schema({
  name: String,
  semester: String,
  schedule: Date,
  teacher: String,
});

export default mongoose.model("Class", classSchema);
