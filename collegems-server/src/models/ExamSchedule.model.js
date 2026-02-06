import mongoose from "mongoose";

const examScheduleSchema = new mongoose.Schema({
  examName: {
    type: String,
    required: true,
  },
  course: {
    type: String,
    required: true,
  },
  examDate: {
    type: String, // YYYY-MM-DD
  },
  startTime: {
    type: String, // HH:mm
  },
  endTime: {
    type: String, // HH:mm
  },
  location: {
    type: String,
  },
  venue: {
    type: Number,
  },
});
examScheduleSchema.index(
  { course: 1, examDate: 1, startTime: 1 },
  { unique: true },
);

export default mongoose.model("ExamSchedule", examScheduleSchema);
