import { describe, it } from "node:test";
import assert from "node:assert";
import mongoose from "mongoose";
import { generateAnalyticsForStudent } from "../services/analytics.service.js";
import User from "../models/User.model.js";
import StudentAnalytics from "../models/StudentAnalytics.model.js";
import Attendance from "../models/Attendance.model.js";
import Results from "../models/Results.model.js";

// Mock global fetch to simulate Python ML Microservice
global.fetch = async (url, options) => {
    const body = JSON.parse(options.body);
    
    // Simulate high risk if attendance < 75
    let riskScore = 0.1;
    let riskLevel = "low";
    let interventions = ["No action required"];
    
    if (body.attendance_percentage < 75) {
        riskScore = 0.85;
        riskLevel = "high";
        interventions = ["Send Attendance Warning", "Assign Mentor for 1-on-1 Session"];
    }

    return {
        ok: true,
        json: async () => ({
            student_id: body.student_id,
            dropout_risk_score: riskScore,
            risk_level: riskLevel,
            predicted_grade: riskLevel === "high" ? "F" : "B",
            recommended_interventions: interventions
        })
    };
};

describe("Analytics Service Tests", () => {
    it("should generate analytics for a student correctly", async () => {
        // Mock mongoose models
        const mockStudentId = new mongoose.Types.ObjectId();
        
        User.findById = async (id) => ({
            _id: id,
            role: "student",
            name: "Test Student"
        });

        Attendance.countDocuments = async (query) => {
             if (query.status === "present") return 6; // 6 present out of 10
             return 10; // Total attendance
        }; // Attendance = 60%

        Results.find = async () => ([
             { internalMarks: 20 },
             { internalMarks: 15 }
        ]);

        StudentAnalytics.findOneAndUpdate = async (query, update, options) => {
             return {
                 studentId: mockStudentId,
                 ...update
             };
        };

        const result = await generateAnalyticsForStudent(mockStudentId);

        // Attendance is 60%, so the mocked ML should return high risk
        assert.strictEqual(result.riskLevel, "high");
        assert.strictEqual(result.dropoutRiskScore, 0.85);
        assert.strictEqual(result.predictedPerformance, "F");
        assert.ok(result.recommendedInterventions.includes("Send Attendance Warning"));
    });
});
