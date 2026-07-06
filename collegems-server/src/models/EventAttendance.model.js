import mongoose from "mongoose";

const EventAttendanceSchema = new mongoose.Schema(
    {
        event: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Event",
            required: true,
        },
        participant: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        checkInTime: {
            type: Date,
            default: Date.now,
        },
        status: {
            type: String,
            enum: ["checked-in", "absent"],
            default: "checked-in",
        }
    },
    { timestamps: true }
);

// Prevent duplicate check-ins
EventAttendanceSchema.index(
    { event: 1, participant: 1 },
    { unique: true }
);

const EventAttendance = mongoose.model("EventAttendance", EventAttendanceSchema);

export default EventAttendance;
