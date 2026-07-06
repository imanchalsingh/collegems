import mongoose from "mongoose";

const InternalAssessmentSchema = new mongoose.Schema({
    studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    courseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Course",
        required: true,
    },
    scores: [{
        componentName: { type: String, required: true },
        score: { type: Number, required: true, min: 0 }
    }],
    totalInternalMarks: {
        type: Number,
        default: 0
    }
}, { timestamps: true });

export default mongoose.model("InternalAssessment", InternalAssessmentSchema);
