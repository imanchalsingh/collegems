// ─── FILE: collegems-server/src/controllers/assignment.controller.js ──────────

import Assignment from "../models/Assignment.model.js";
import Course from "../models/Course.model.js";
import mongoose from "mongoose";
import fs from "fs";
import path from "path";
import { publishEvent } from "../utils/rabbitmq.js";
import { checkSemesterFrozen } from "../services/semesterService.js";

export const createAssignment = async (req, res) => {
  try {
    const { title, courseId, dueDate, description, submissionType, validationRules } = req.body;
    const totalPointsRaw =
      req.body.totalPoints !== undefined
        ? req.body.totalPoints
        : req.body.maxMarks;

    if (!title || !courseId || !dueDate) {
      return res.status(400).json({ message: "All fields are required" });
    }
    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      return res.status(400).json({ message: "Invalid course ID" });
    }
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const totalPoints =
      totalPointsRaw !== undefined && totalPointsRaw !== ""
        ? Number(totalPointsRaw)
        : undefined;

    if (totalPointsRaw !== undefined && Number.isNaN(totalPoints)) {
      return res.status(400).json({ message: "Invalid total points" });
    }

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }
    await checkSemesterFrozen(course.semester);

    const assignment = await Assignment.create({
      title,
      description,
      course: courseId,
      teacher: req.user.id,
      dueDate,
      totalPoints,
      submissionType: submissionType || "file",
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
    if (submissionType === "file" && !hasFile)
      return res.status(400).json({ message: "File is required" });
    if (submissionType === "text" && !hasText)
      return res.status(400).json({ message: "Text response is required" });
    if (submissionType === "link" && !hasLink)
      return res.status(400).json({ message: "Link is required" });
    if (submissionType === "both" && (!hasFile || !hasText))
      return res.status(400).json({ message: "File and text response are required" });

    // Validate using assignment validation rules
    const rules = assignment.validationRules || {
      maxFileSizeMB: 5,
      allowedFileTypes: ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "image/jpeg", "image/png"],
      minTextLength: 10
    };

    if (hasFile && req.file) {
      const maxSizeBytes = (rules.maxFileSizeMB || 5) * 1024 * 1024;
      if (req.file.size > maxSizeBytes) {
        // Also remove the uploaded file to free space
        if (req.file.path) fs.unlinkSync(req.file.path);
        return res.status(400).json({ message: `File size exceeds maximum limit of ${rules.maxFileSizeMB}MB` });
      }
      if (rules.allowedFileTypes && rules.allowedFileTypes.length > 0) {
        if (!rules.allowedFileTypes.includes(req.file.mimetype)) {
          if (req.file.path) fs.unlinkSync(req.file.path);
          return res.status(400).json({ message: "Invalid file type uploaded" });
        }
      }
    }

    if (hasText) {
      if (textResponse.length < (rules.minTextLength || 10)) {
        if (req.file && req.file.path) fs.unlinkSync(req.file.path);
        return res.status(400).json({ message: `Text response must be at least ${rules.minTextLength} characters long` });
      }
    }

    if (hasLink) {
      try {
        const parsed = new URL(link);
        if (!/^https?:$/.test(parsed.protocol)) {
          if (req.file && req.file.path) fs.unlinkSync(req.file.path);
          return res.status(400).json({ message: "Invalid link format. Must be http or https." });
        }
      } catch {
        if (req.file && req.file.path) fs.unlinkSync(req.file.path);
        return res.status(400).json({ message: "Invalid link format" });
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

    if (!studentId) {
      return res.status(400).json({
        success: false,
        message: "studentId is required",
      });
    }

    const submission = assignment.submissions.find(
      (s) => s.student.toString() === studentId
    );
    if (!submission) {
      return res.status(404).json({
        success: false,
        message: "Submission not found",
      });
    }

    // Validate marks
    const numericMarks = Number(marks);
    if (
      marks === undefined ||
      marks === null ||
      isNaN(numericMarks) ||
      numericMarks < 0 ||
      (assignment.totalPoints !== undefined && assignment.totalPoints !== null && numericMarks > assignment.totalPoints)
    ) {
      return res.status(400).json({
        success: false,
        message: `Marks must be between 0 and ${assignment.totalPoints}`,
      });
    }

    submission.marks = numericMarks;
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

    // Fetch all assignments and populate course name
    const all = await Assignment.find()
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

    // Fetch all assignments created by this teacher
    const assignments = await Assignment.find({ teacher: teacherId })
      .populate("course", "name code")
      .populate("submissions.student", "name email avatarUrl photo") // Important for viewing submissions!
      // 👇 NEW: Populate the user details inside the comments array for the teacher's view!
      .populate("comments.user", "name role avatarUrl photo") 
      .sort({ createdAt: -1 })
      .lean();

    res.json(assignments);
  } catch (error) {
    console.error("GetTeacherAssignments Error:", error);
    res.status(500).json({ message: "Failed to fetch teacher assignments" });
  }
};

// download assignment file securely
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
    res.download(filePath, submission.file.originalName);
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
    
    // Find the assignment and populate the student details inside the submissions array
    const assignment = await Assignment.findById(assignmentId)
      .populate({
        path: "submissions.student",
        select: "name email avatarUrl photo", // Pulling in necessary student profile data
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
// NEW FUNCTION — Adds a public comment/question to an assignment
// ─────────────────────────────────────────────────────────────────────────────

export const addAssignmentComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { text } = req.body;
    
    if (!text || text.trim() === "") {
      return res.status(400).json({ message: "Comment text is required" });
    }

    const assignment = await Assignment.findById(id).populate("course");
    if (!assignment) {
      return res.status(404).json({ message: "Assignment not found" });
    }

    if (assignment.course && assignment.course.semester) {
      await checkSemesterFrozen(assignment.course.semester);
    }

    // Add the comment
    assignment.comments.push({
      user: req.user.id,
      text: text.trim()
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