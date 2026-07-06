import AssessmentConfig from "../models/AssessmentConfig.model.js";
import InternalAssessment from "../models/InternalAssessment.model.js";
import Course from "../models/Course.model.js";
import User from "../models/User.model.js";

// 1. Get Assessment Config for a Course
export const getAssessmentConfig = async (req, res) => {
    try {
        const { courseId } = req.params;
        const config = await AssessmentConfig.findOne({ courseId });
        if (!config) {
            return res.status(404).json({ message: "Assessment config not found for this course" });
        }
        res.status(200).json(config);
    } catch (error) {
        res.status(500).json({ message: "Error fetching assessment config", error: error.message });
    }
};

// 2. Create or Update Assessment Config
export const saveAssessmentConfig = async (req, res) => {
    try {
        const { courseId } = req.params;
        const { components } = req.body;

        const totalWeightage = components.reduce((sum, comp) => sum + Number(comp.weightage), 0);
        if (totalWeightage !== 100) {
            return res.status(400).json({ message: "Total weightage must be exactly 100%" });
        }

        let config = await AssessmentConfig.findOne({ courseId });
        if (config) {
            config.components = components;
            await config.save();
        } else {
            config = await AssessmentConfig.create({ courseId, components });
        }

        res.status(200).json({ message: "Assessment config saved successfully", config });
    } catch (error) {
        console.error("Save config error:", error);
        res.status(500).json({ message: "Error saving assessment config", error: error.message, stack: error.stack });
    }
};

// 3. Get Student Internal Assessments for a Course
export const getInternalAssessments = async (req, res) => {
    try {
        const { courseId } = req.params;
        const assessments = await InternalAssessment.find({ courseId }).populate("studentId", "name email");
        res.status(200).json(assessments);
    } catch (error) {
        res.status(500).json({ message: "Error fetching internal assessments", error: error.message });
    }
};

// 4. Save Student Internal Assessment Scores
export const saveInternalAssessment = async (req, res) => {
    try {
        const { courseId, studentId } = req.params;
        const { scores } = req.body; // Array of { componentName, score }

        const config = await AssessmentConfig.findOne({ courseId });
        if (!config) {
            return res.status(400).json({ message: "Assessment configuration not set for this course." });
        }

        // Calculate total internal marks
        let totalInternalMarks = 0;
        for (const s of scores) {
            const compConfig = config.components.find(c => c.name === s.componentName);
            if (compConfig) {
                // Formula: (score / maxMarks) * weightage
                const computedMark = (s.score / compConfig.maxMarks) * compConfig.weightage;
                totalInternalMarks += computedMark;
            }
        }

        let assessment = await InternalAssessment.findOne({ courseId, studentId });
        if (assessment) {
            assessment.scores = scores;
            assessment.totalInternalMarks = totalInternalMarks;
            await assessment.save();
        } else {
            assessment = await InternalAssessment.create({
                courseId,
                studentId,
                scores,
                totalInternalMarks
            });
        }

        res.status(200).json({ message: "Internal assessment saved successfully", assessment });
    } catch (error) {
        res.status(500).json({ message: "Error saving internal assessment", error: error.message });
    }
};
