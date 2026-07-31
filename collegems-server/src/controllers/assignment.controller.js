// ─── FILE: collegems-server/src/controllers/assignment.controller.js ──────────

import Assignment from "../models/Assignment.model.js";
import Course from "../models/Course.model.js";
import mongoose from "mongoose";
import fs from "fs";
import path from "path";
import { publishEvent } from "../utils/rabbitmq.js";
import { checkSemesterFrozen } from "../services/semesterService.js";
import {
  validateCourseId,
  validateTotalPoints,
  validateTitle,
  validateDescription,
  validateDueDate,
  validateSubmissionType,
  validateFile,
  validateLink,
  validateTextSubmission,
  validateMarks,
  validateComment,
  validateAssignmentId,
  validateSubmissionId,
  sanitizeString
} from "../utils/assignmentValidators.js";

// ============================================
// CONTROLLER FUNCTIONS
// ============================================

export const createAssignment = async (req, res) => {
  try {
    const { title, courseId, dueDate, description, submissionType, validationRules } = req.body;
    const totalPointsRaw =
      req.body.totalPoints !== undefined
        ? req.body.totalPoints
        : req.body.maxMarks;

    // Validate Title
    const titleValidation = validateTitle(title);
    if (!titleValidation.valid) {
      return res.status(400).json({ message: titleValidation.error });
    }

    // Validate Course ID
    const courseValidation = validateCourseId(courseId);
    if (!courseValidation.valid) {
      return res.status(400).json({ message: courseValidation.error });
    }

    // Validate Due Date
    const dueDateValidation = validateDueDate(dueDate);
    if (!dueDateValidation.valid) {
      return res.status(400).json({ message: dueDateValidation.error });
    }

    // Validate Total Points
    const pointsValidation = validateTotalPoints(totalPointsRaw);
    if (!pointsValidation.valid) {
      return res.status(400).json({ message: pointsValidation.error });
    }

    // Validate Submission Type
    const submissionTypeValidation = validateSubmissionType(submissionType);
    if (!submissionTypeValidation.valid) {
      return res.status(400).json({ message: submissionTypeValidation.error });
    }

    // Validate Description (optional but validate if provided)
    let validDescription = "";
    if (description) {
      const descValidation = validateDescription(description);
      if (!descValidation.valid) {
        return res.status(400).json({ message: descValidation.error });
      }
      validDescription = descValidation.value;
    }

    // Check authorization
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const course = await Course.findById(courseValidation.value);
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }
    await checkSemesterFrozen(course.semester);

    const assignment = await Assignment.create({
      title: titleValidation.value,
      description: validDescription,
      course: courseValidation.value,
      teacher: req.user.id,
      dueDate: dueDateValidation.value,
      totalPoints: pointsValidation.value,
      submissionType: submissionTypeValidation.value || "file",
      validationRules,
    });

    res.status(201).json(assignment);
  } catch (error) {
    console.error("Create Assignment Error:", error);
    if (error.status === 403) return res.status(403).json({ message: error.message });
    res.status(500).json({ message: "Failed to create assignment" });
  }
};

export const submitAssignment = async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.id).populate("course");
    if (!assignment) {
      return res.status(404).json({ message: "Assignment not found" });
    }

    // Check if already submitted
    const alreadySubmitted = assignment.submissions.some(
      (s) => s.student.toString() === req.user.id
    );
    if (alreadySubmitted) {
      return res.status(400).json({ message: "Assignment already submitted" });
    }

    const submissionType = assignment.submissionType || "file";
    const textResponse =
      typeof req.body.textResponse === "string" ? req.body.textResponse.trim() : "";
    const link = typeof req.body.link === "string" ? req.body.link.trim() : "";
    const hasFile = Boolean(req.file);
    const hasText = Boolean(textResponse);
    const hasLink = Boolean(link);

    // Validate submission type requirements
    if (submissionType === "file" && !hasFile) {
      if (req.file && req.file.path) fs.unlinkSync(req.file.path);
      return res.status(400).json({ message: "File is required" });
    }
    if (submissionType === "text" && !hasText) {
      return res.status(400).json({ message: "Text response is required" });
    }
    if (submissionType === "link" && !hasLink) {
      return res.status(400).json({ message: "Link is required" });
    }
    if (submissionType === "both" && (!hasFile || !hasText)) {
      if (req.file && req.file.path) fs.unlinkSync(req.file.path);
      return res.status(400).json({ message: "File and text response are required" });
    }

    // Validate using assignment validation rules
    const rules = assignment.validationRules || {
      maxFileSizeMB: 5,
      allowedFileTypes: ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "image/jpeg", "image/png"],
      minTextLength: 10
    };

    // Validate file if present
    if (hasFile && req.file) {
      const fileValidation = validateFile(req.file, (rules.maxFileSizeMB || 5) * 1024 * 1024);
      if (!fileValidation.valid) {
        if (req.file.path) fs.unlinkSync(req.file.path);
        return res.status(400).json({ message: fileValidation.error });
      }
    }

    // Validate text if present
    if (hasText) {
      const textValidation = validateTextSubmission(textResponse);
      if (!textValidation.valid) {
        if (req.file && req.file.path) fs.unlinkSync(req.file.path);
        return res.status(400).json({ message: textValidation.error });
      }
      // Check min length from rules
      if (textResponse.length < (rules.minTextLength || 10)) {
        if (req.file && req.file.path) fs.unlinkSync(req.file.path);
        return res.status(400).json({ 
          message: `Text response must be at least ${rules.minTextLength || 10} characters long` 
        });
      }
    }

    // Validate link if present
    if (hasLink) {
      const linkValidation = validateLink(link);
      if (!linkValidation.valid) {
        if (req.file && req.file.path) fs.unlinkSync(req.file.path);
        return res.status(400).json({ message: linkValidation.error });
      }
    }

    const baseUrl = `${req.protocol}://${req.get("host")}`;
    const submission = {
      student: req.user.id,
      submittedAt: new Date(),
      status: "submitted",
      textResponse: hasText ? textResponse : undefined,
      link: hasLink ? link : undefined,
      file: req.file
        ? {
            url: `${baseUrl}/api/assignment/download/${req.file.filename}`,
            originalName: req.file.originalname,
            mimeType: req.file.mimetype,
            size: req.file.size,
            filename: req.file.filename,
          }
        : undefined,
    };

    assignment.submissions.push(submission);
    await assignment.save();
    
    // Background Plagiarism Detection Pipeline Trigger
    publishEvent("academics", "assignment.submitted", {
      assignmentId: assignment._id,
      studentId: req.user.id
    });

    res.json({ message: "Assignment submitted", submission });
  } catch (error) {
    console.error("Submit Assignment Error:", error);
    if (error.status === 403) return res.status(403).json({ message: error.message });
    res.status(500).json({ message: "Submission failed" });
  }
};

export const evaluateAssignment = async (req, res) => {
  try {
    const { studentId, marks } = req.body;
    const assignment = await Assignment.findById(req.params.id).populate("course");

    if (!assignment) {
      return res.status(404).json({ message: "Assignment not found" });
    }

    // Check semester frozen
    if (assignment.course && assignment.course.semester) {
      await checkSemesterFrozen(assignment.course.semester);
    }

    // Verify assignment ownership
    if (assignment.teacher.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to evaluate this assignment",
      });
    }

    // Validate Student ID
    const studentValidation = validateSubmissionId(studentId);
    if (!studentValidation.valid) {
      return res.status(400).json({
        success: false,
        message: studentValidation.error,
      });
    }

    const submission = assignment.submissions.find(
      (s) => s.student.toString() === studentValidation.value
    );
    if (!submission) {
      return res.status(404).json({
        success: false,
        message: "Submission not found",
      });
    }

    // Validate Marks
    const marksValidation = validateMarks(marks, assignment.totalPoints);
    if (!marksValidation.valid) {
      return res.status(400).json({
        success: false,
        message: marksValidation.error,
      });
    }

    submission.marks = marksValidation.value;
    submission.status = "graded";
    await assignment.save();
    res.json({ message: "Assignment evaluated" });
  } catch (error) {
    console.error("Evaluate Assignment Error:", error);
    if (error.status === 403) return res.status(403).json({ message: error.message });
    res.status(500).json({ message: "Evaluation failed" });
  }
};

export const getUpcomingAssignments = async (req, res) => {
  try {
    const studentId = req.user.id;

    // 🔴 ADD THIS FILTER: { isDeleted: { $ne: true } }
    // Fetch all active assignments and populate course name
    const all = await Assignment.find({ isDeleted: { $ne: true } })
      .populate("course", "name code")
      .populate("teacher", "name")
      .lean();

    const now = new Date();
    // Start of today (midnight)
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    // End of today
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
    // 2 days from now
    const twoDaysLater = new Date(todayStart.getTime() + 2 * 24 * 60 * 60 * 1000);
    // 7 days ago (to show recently submitted)
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const results = [];

    for (const assignment of all) {
      const due = new Date(assignment.dueDate);
      const mySubmission = (assignment.submissions || []).find(
        (s) => s.student.toString() === studentId
      );
      let status;

      if (mySubmission) {
        // Only include submitted ones if submitted recently (last 7 days)
        if (new Date(mySubmission.submittedAt) >= sevenDaysAgo) {
          status = "submitted";
        } else {
          continue; // old submission — skip
        }
      } else if (due < todayStart) {
        status = "overdue";
      } else if (due >= todayStart && due < todayEnd) {
        status = "dueToday";
      } else if (due >= todayEnd && due <= twoDaysLater) {
        status = "upcoming";
      } else {
        continue; // due date too far in the future — skip
      }

      results.push({
        _id: assignment._id,
        title: assignment.title,
        description: assignment.description,
        dueDate: assignment.dueDate,
        totalPoints: assignment.totalPoints,
        course: assignment.course,
        teacher: assignment.teacher,
        submissionType: assignment.submissionType,
        status,
        submittedAt: mySubmission?.submittedAt || null,
        marks: mySubmission?.marks || null,
      });
    }

    // Sort: overdue → dueToday → upcoming → submitted
    const ORDER = { overdue: 0, dueToday: 1, upcoming: 2, submitted: 3 };
    results.sort((a, b) => ORDER[a.status] - ORDER[b.status]);

    res.json(results);
  } catch (error) {
    console.error("GetUpcomingAssignments Error:", error);
    res.status(500).json({ message: "Failed to fetch assignment reminders" });
  }
};

/**
 * GET /api/assignment/teacher
 * Returns all assignments created by the logged-in teacher.
 */
export const getTeacherAssignments = async (req, res) => {
  try {
    const teacherId = req.user.id;

    // UPDATE: Add { isDeleted: { $ne: true } } to the query
    const assignments = await Assignment.find({ 
      teacher: teacherId, 
      isDeleted: { $ne: true } // 🔴 Filters out deleted assignments
    })
      .populate("course", "name code")
      .populate("submissions.student", "name email avatarUrl photo")
      .populate("comments.user", "name role avatarUrl photo") 
      .sort({ createdAt: -1 })
      .lean();

    res.json(assignments);
  } catch (error) {
    console.error("GetTeacherAssignments Error:", error);
    res.status(500).json({ message: "Failed to fetch teacher assignments" });
  }
};

/**
 * GET /api/assignment/download/:filename
 * Download assignment file securely
 */
export const downloadAssignmentFile = async (req, res) => {
  try {
    const { filename } = req.params;

    // Find the assignment that has this submission filename
    const assignment = await Assignment.findOne({ "submissions.file.filename": filename });

    if (!assignment) {
      return res.status(404).json({ message: "File not found" });
    }

    // Find the specific submission inside this assignment
    const submission = assignment.submissions.find(
      (s) => s.file && s.file.filename === filename
    );

    if (!submission) {
      return res.status(404).json({ message: "File not found" });
    }

    // Check authorization:
    // Teachers and HODs can download any file.
    // Students can only download their own submissions.
    const isTeacher = req.user.role === "teacher" || req.user.role === "hod";
    const isOwner = submission.student.toString() === req.user.id;

    if (!isTeacher && !isOwner) {
      return res.status(403).json({ message: "Access denied. You are not authorized to download this file." });
    }

    const filePath = path.join(process.cwd(), "secure-uploads", "assignments", filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: "File not found on server" });
    }

    // Set secure headers to prevent XSS / raw execution of files:
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Content-Security-Policy", "default-src 'none'");

    // Serve the file as a download/attachment with the original filename
    res.set({
      'Content-Disposition': `inline; filename="${submission.file.originalName}"`
    });
    res.sendFile(filePath);
  } catch (error) {
    console.error("Download Assignment Error:", error);
    res.status(500).json({ message: "Failed to download file" });
  }
};

/**
 * GET /api/assignment/teacher/submissions/:id
 * Fetches a single assignment and populates the student data for the submissions
 */
export const getAssignmentSubmissions = async (req, res) => {
  try {
    const assignmentId = req.params.id;
    
    // Validate Assignment ID
    const assignmentValidation = validateAssignmentId(assignmentId);
    if (!assignmentValidation.valid) {
      return res.status(400).json({ message: assignmentValidation.error });
    }
    
    // Find the assignment and populate the student details inside the submissions array
    const assignment = await Assignment.findById(assignmentValidation.value)
      .populate({
        path: "submissions.student",
        select: "name email avatarUrl photo",
      });

    if (!assignment) {
      return res.status(404).json({ message: "Assignment not found" });
    }

    res.status(200).json(assignment);
  } catch (error) {
    console.error("Error fetching assignment submissions:", error);
    res.status(500).json({ message: "Failed to fetch submissions" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// ADD COMMENT — Adds a public comment/question to an assignment
// ─────────────────────────────────────────────────────────────────────────────

export const addAssignmentComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { text } = req.body;
    
    // Validate Comment
    const commentValidation = validateComment(text);
    if (!commentValidation.valid) {
      return res.status(400).json({ message: commentValidation.error });
    }

    // Validate Assignment ID
    const assignmentValidation = validateAssignmentId(id);
    if (!assignmentValidation.valid) {
      return res.status(400).json({ message: assignmentValidation.error });
    }

    const assignment = await Assignment.findById(assignmentValidation.value).populate("course");
    if (!assignment) {
      return res.status(404).json({ message: "Assignment not found" });
    }

    if (assignment.course && assignment.course.semester) {
      await checkSemesterFrozen(assignment.course.semester);
    }

    // Add the comment
    assignment.comments.push({
      user: req.user.id,
      text: commentValidation.value
    });

    await assignment.save();

    // Fetch the newly saved assignment and populate the user details for the UI response
    const updatedAssignment = await Assignment.findById(id).populate(
      "comments.user", 
      "name role avatarUrl photo"
    );

    res.status(201).json({ 
      success: true, 
      data: updatedAssignment.comments 
    });
  } catch (error) {
    console.error("Error adding comment:", error);
    if (error.status === 403) return res.status(403).json({ message: error.message });
    res.status(500).json({ message: "Failed to add comment" });
  }
};
// ─────────────────────────────────────────────────────────────────────────────
// SOFT DELETE & RESTORE ASSIGNMENT
// ─────────────────────────────────────────────────────────────────────────────

export const deleteAssignment = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate Assignment ID
    const assignmentValidation = validateAssignmentId(id);
    if (!assignmentValidation.valid) {
      return res.status(400).json({ message: assignmentValidation.error });
    }

    const deletedAssignment = await Assignment.findByIdAndUpdate(
      assignmentValidation.value, 
      { isDeleted: true }, // Soft delete flag
      { new: true }
    );

    if (!deletedAssignment) {
      return res.status(404).json({ message: "Assignment not found" });
    }

    res.status(200).json({ message: "Assignment deleted successfully", assignment: deletedAssignment });
  } catch (error) {
    console.error("Delete Assignment Error:", error);
    res.status(500).json({ message: "Server error during deletion" });
  }
};

export const restoreAssignment = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate Assignment ID
    const assignmentValidation = validateAssignmentId(id);
    if (!assignmentValidation.valid) {
      return res.status(400).json({ message: assignmentValidation.error });
    }

    const restoredAssignment = await Assignment.findByIdAndUpdate(
      assignmentValidation.value, 
      { isDeleted: false }, // Remove soft delete flag
      { new: true }
    );

    if (!restoredAssignment) {
      return res.status(404).json({ message: "Assignment not found" });
    }

    res.status(200).json({ message: "Assignment restored successfully", assignment: restoredAssignment });
  } catch (error) {
    console.error("Restore Assignment Error:", error);
    res.status(500).json({ message: "Server error during restoration" });
  }
};
// Add this new function to handle the upvote toggle
// Add this new function to handle the upvote toggle using ES6 export
export const toggleUpvote = async (req, res) => {
  try {
    const { id } = req.params;
    const { upvoted } = req.body; 
    
    // NOTE: req.user._id depends on your auth middleware. 
    // It might be req.userId or req.studentId depending on your setup!
    const userId = req.user._id || req.userId; 

    // Assuming you have imported your Assignment model at the top like:
    // import Assignment from '../models/assignment.model.js';
    const assignment = await Assignment.findById(id);
    if (!assignment) {
      return res.status(404).json({ message: "Assignment not found" });
    }

    // Initialize if undefined
    if (!assignment.upvotedBy) assignment.upvotedBy = [];
    if (!assignment.helpfulCount) assignment.helpfulCount = 0;

    // Convert ObjectIds to strings for safe comparison
    const hasUpvoted = assignment.upvotedBy.some(
      (uid) => uid.toString() === userId.toString()
    );

    if (upvoted && !hasUpvoted) {
      // User is upvoting
      assignment.upvotedBy.push(userId);
      assignment.helpfulCount += 1;
    } else if (!upvoted && hasUpvoted) {
      // User is removing their upvote
      assignment.upvotedBy = assignment.upvotedBy.filter(
        (uid) => uid.toString() !== userId.toString()
      );
      assignment.helpfulCount = Math.max(0, assignment.helpfulCount - 1);
    }

    await assignment.save();
    
    res.status(200).json({ 
      success: true, 
      helpfulCount: assignment.helpfulCount 
    });
  } catch (error) {
    console.error("Error toggling upvote:", error);
    res.status(500).json({ message: "Server error toggling upvote" });
  }
};
// Add to src/controllers/assignment.controller.js
export const toggleComplete = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id || req.user.id; 

    const assignment = await Assignment.findById(id);
    if (!assignment) {
      return res.status(404).json({ message: "Assignment not found" });
    }

    // Initialize array if it doesn't exist
    if (!assignment.completedBy) assignment.completedBy = [];

    // Check if already completed by this user
    const hasCompleted = assignment.completedBy.some(
      (uid) => uid.toString() === userId.toString()
    );

    if (hasCompleted) {
      // Remove from completed list (uncheck)
      assignment.completedBy = assignment.completedBy.filter(
        (uid) => uid.toString() !== userId.toString()
      );
    } else {
      // Add to completed list (check)
      assignment.completedBy.push(userId);
    }

    await assignment.save();
    
    res.status(200).json({ 
      success: true, 
      completedBy: assignment.completedBy 
    });
  } catch (error) {
    console.error("Error toggling completion:", error);
    res.status(500).json({ message: "Server error toggling completion status" });
  }
};