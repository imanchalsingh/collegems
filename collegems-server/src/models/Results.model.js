import mongoose from "mongoose";
import snapshotPlugin from "../plugins/snapshotPlugin.js";

const ResultsSchema = new mongoose.Schema({
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

    semester: {
        type: String,
    },

    internalMarks: Number,
    externalMarks: Number,
    practicalMarks: Number,

    totalMarks: Number,

    grade: {
        type: String,
    },

    status: {
        type: String,
        enum: ["draft", "published"],
        default: "draft",
    },

    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
    }

}, { timestamps: true });

ResultsSchema.plugin(snapshotPlugin);

export default mongoose.model("Results", ResultsSchema);