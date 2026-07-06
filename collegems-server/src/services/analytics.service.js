import StudentAnalytics from "../models/StudentAnalytics.model.js";
import User from "../models/User.model.js";
import Attendance from "../models/Attendance.model.js";
import Results from "../models/Results.model.js";
import Feedback from "../models/Feedback.model.js";

import httpContext from "express-http-context";
import log from "../utils/logger.js";

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || "http://localhost:8000";

export const generateAnalyticsForStudent = async (studentId) => {
    try {
        // 1. Gather historical data for the student
        const student = await User.findById(studentId);
        if (!student || student.role !== "student") {
            throw new Error("Student not found or invalid role");
        }

        // Calculate attendance percentage
        const totalAttendance = await Attendance.countDocuments({ student: studentId });
        const presentAttendance = await Attendance.countDocuments({ student: studentId, status: "present" });
        const attendancePercentage = totalAttendance === 0 ? 100 : (presentAttendance / totalAttendance) * 100;

        // Calculate average internal marks from Results (seeded data)
        const assessments = await Results.find({ studentId });
        let totalInternalPercentage = 0;
        let missedAssessments = 0;
        
        assessments.forEach(assessment => {
            if (assessment.internalMarks > 0) {
                 // Assuming internal marks are out of 30 in the seeded data
                 totalInternalPercentage += (assessment.internalMarks / 30) * 100;
            } else {
                 missedAssessments += 1;
            }
        });
        
        const averageInternalMarks = assessments.length === 0 ? 50 : (totalInternalPercentage / assessments.length);

        const payload = {
            student_id: student._id.toString(),
            attendance_percentage: attendancePercentage,
            average_internal_marks: averageInternalMarks,
            previous_gpa: null,
            missed_assessments: missedAssessments
        };

        // 2. Call ML Service
        const correlationId = httpContext.get('correlationId') || 'N/A';
        log.info(`Sending prediction request to ML service for student ${studentId}`);
        
        const response = await fetch(`${ML_SERVICE_URL}/predict/dropout`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'X-Correlation-ID': correlationId
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error("Failed to fetch predictions from ML service");
        }

        const prediction = await response.json();

        // 3. Update or Create Analytics record
        const updatedAnalytics = await StudentAnalytics.findOneAndUpdate(
            { studentId: student._id },
            {
                dropoutRiskScore: prediction.dropout_risk_score,
                riskLevel: prediction.risk_level,
                predictedPerformance: prediction.predicted_grade,
                recommendedInterventions: prediction.recommended_interventions,
                lastCalculatedAt: new Date()
            },
            { new: true, upsert: true }
        );

        return updatedAnalytics;

    } catch (error) {
        console.error(`Error generating analytics for student ${studentId}:`, error);
        throw error;
    }
};

export const batchGenerateAnalytics = async () => {
    console.log("Starting batch analytics generation...");
    try {
        const students = await User.find({ role: "student" });
        for (const student of students) {
             await generateAnalyticsForStudent(student._id);
        }
        console.log("Batch analytics generation completed successfully.");
    } catch (error) {
        console.error("Error in batch analytics job:", error);
    }
};

export const analyzeFeedbackSentiment = async (feedbackId, text) => {
    try {
        const payload = {
            feedback_id: feedbackId.toString(),
            text: text
        };

        const correlationId = httpContext.get('correlationId') || 'N/A';
        log.info(`Sending sentiment analysis request to ML service for feedback ${feedbackId}`);
        
        const response = await fetch(`${ML_SERVICE_URL}/predict/sentiment`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'X-Correlation-ID': correlationId
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error("Failed to fetch sentiment from ML service");
        }

        const prediction = await response.json();
        
        return prediction; // { sentiment, sentiment_score }
    } catch (error) {
        log.error(`Error analyzing sentiment for feedback ${feedbackId}: ${error.message}`);
        // Return neutral fallback instead of breaking the flow
        return { sentiment: "Neutral", sentiment_score: 0 };
    }
};

export const batchAnalyzeSentiments = async () => {
    log.info("Starting batch sentiment analysis...");
    try {
        const feedbacks = await Feedback.find({ sentiment: "Unanalyzed" });
        let processed = 0;
        for (const feedback of feedbacks) {
             const result = await analyzeFeedbackSentiment(feedback._id, feedback.message);
             feedback.sentiment = result.sentiment;
             feedback.sentimentScore = result.sentiment_score;
             await feedback.save();
             processed++;
        }
        log.info(`Batch sentiment analysis completed. Processed ${processed} feedbacks.`);
    } catch (error) {
        log.error(`Error in batch sentiment job: ${error.message}`);
    }
};
