import mongoose from "mongoose";

const timetableEntrySchema = new mongoose.Schema(
  {
    timetable: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Timetable",
      required: true,
      index: true,
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },
    faculty: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room",
      required: true,
    },
    timeSlot: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TimeSlot",
      required: true,
    },
  },
  { timestamps: true }
);

// Prevent duplicate entries for the same room and timeslot in a specific timetable
timetableEntrySchema.index({ timetable: 1, room: 1, timeSlot: 1 }, { unique: true });

// Prevent duplicate entries for the same faculty and timeslot in a specific timetable
timetableEntrySchema.index({ timetable: 1, faculty: 1, timeSlot: 1 }, { unique: true });

// Prevent duplicate entries for the same course and timeslot in a specific timetable (unless lab sectioning is needed)
timetableEntrySchema.index({ timetable: 1, course: 1, timeSlot: 1 }, { unique: true });

export default mongoose.model("TimetableEntry", timetableEntrySchema);
