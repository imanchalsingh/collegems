import Assignment from "../models/Assignment.model.js";
import mongoose from "mongoose";

export const createAssignment = async (req, res) => {
  try {
    const { title, courseId, dueDate } = req.body;

    if (!title || !courseId || !dueDate) {
      return res.status(400).json({
        message: "All fields are required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      return res.status(400).json({
        message: "Invalid course ID",
      });
    }

    if (!req.user) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    const assignment = await Assignment.create({
      title,
      course: courseId,
      teacher: req.user.id,
      dueDate,
    });

    res.status(201).json(assignment);
  } catch (error) {
    console.error("Create Assignment Error:", error);
    res.status(500).json({
      message: "Failed to create assignment",
    });
  }
};

// submit assignment
export const submitAssignment = async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.id);

    if (!assignment) {
      return res.status(404).json({ message: "Assignment not found" });
    }

    const alreadySubmitted = assignment.submissions.some(
      (s) => s.student.toString() === req.user.id,
    );

    if (alreadySubmitted) {
      return res.status(400).json({
        message: "Assignment already submitted",
      });
    }

    assignment.submissions.push({
      student: req.user.id,
      submittedAt: new Date(),
    });

    await assignment.save();

    res.json({ message: "Assignment submitted" });
  } catch (error) {
    console.error("Submit Assignment Error:", error);
    res.status(500).json({ message: "Submission failed" });
  }
};

// evaluate assignment
export const evaluateAssignment = async (req, res) => {
  try {
    const { studentId, marks } = req.body;

    const assignment = await Assignment.findById(req.params.id);

    if (!assignment) {
      return res.status(404).json({
        message: "Assignment not found",
      });
    }

    const submission = assignment.submissions.find(
      (s) => s.student.toString() === studentId,
    );

    if (!submission) {
      return res.status(404).json({
        message: "Submission not found",
      });
    }

    submission.marks = marks;
    await assignment.save();

    res.json({ message: "Assignment evaluated" });
  } catch (error) {
    console.error("Evaluate Assignment Error:", error);
    res.status(500).json({
      message: "Evaluation failed",
    });
  }
};
