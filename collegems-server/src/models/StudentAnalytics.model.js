import mongoose from "mongoose";

const StudentAnalyticsSchema = new mongoose.Schema({
    studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        unique: true
    },
    dropoutRiskScore: {
        type: Number,
        min: 0.0,
        max: 1.0,
        default: 0.0
    },
    riskLevel: {
        type: String,
        enum: ["low", "medium", "high"],
        default: "low"
    },
    predictedPerformance: {
        type: String,
        default: "N/A"
    },
    recommendedInterventions: [{
        type: String
    }],
    lastCalculatedAt: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

export default mongoose.model("StudentAnalytics", StudentAnalyticsSchema);
