// ─── FILE: collegems-server/src/routes/assignment.routes.js ──────────────────

import express from "express";
import fs from "fs";
import path from "path";
import multer from "multer";
import { allowRoles } from "../middlewares/role.middleware.js";
import { asyncHandler, AppError } from "../middlewares/errorHandler.middleware.js";
import { protect } from '../middlewares/auth.middleware.js';
import log from "../utils/logger.js";
import Assignment from "../models/Assignment.model.js";
import { verifyFileSignature, scanFileForMalware } from "../utils/malwareScanner.js";

// Consolidated all controller imports into one clean block, INCLUDING getUpcomingAssignments
import {
  createAssignment,
  submitAssignment,
  evaluateAssignment,
  downloadAssignmentFile,
  getUpcomingAssignments,
  getTeacherAssignments,
  addAssignmentComment,
} from "../controllers/assignment.controller.js";

const router = express.Router();

// Store files outside the web root (web root is served from 'uploads')
const uploadsDir = path.join(process.cwd(), "secure-uploads", "assignments");
fs.mkdirSync(uploadsDir, { recursive: true });

// Whitelist of allowed MIME types and their corresponding extensions
const ALLOWED_MIME_TYPES = {
  "application/pdf": [".pdf"],
  "application/msword": [".doc"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
  "text/plain": [".txt"],
  "application/rtf": [".rtf"],
  "application/vnd.ms-excel": [".xls"],
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
  "application/vnd.ms-powerpoint": [".ppt"],
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": [".pptx"],
  "application/zip": [".zip"],
  "application/x-zip-compressed": [".zip"],
  "image/png": [".png"],
  "image/jpeg": [".jpg", ".jpeg"],
  "image/gif": [".gif"]
};

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    // Generate secure server-side filename without using user-supplied names
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // Enforce 10MB limit
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedExtensions = ALLOWED_MIME_TYPES[file.mimetype];
    
    if (allowedExtensions && allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error("File type not allowed. Please upload approved formats (.pdf, .doc, .docx, .txt, .zip, .png, .jpg, etc.)"), false);
    }
  }
});

// Middleware to validate signature (magic bytes) and scan file for malware
const validateUploadedFile = async (req, res, next) => {
  if (!req.file) {
    return next();
  }

  const filePath = req.file.path;
  const ext = path.extname(req.file.originalname).toLowerCase();

  try {
    // 1. Verify file signature (magic bytes)
    const isValidSignature = await verifyFileSignature(filePath, ext);
    if (!isValidSignature) {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      return res.status(400).json({ message: "File contents do not match the declared extension." });
    }

    // 2. Scan file content for malware
    const scanResult = await scanFileForMalware(filePath);
    if (!scanResult.safe) {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      return res.status(400).json({ message: `Security threat detected: ${scanResult.reason}` });
    }

    next();
  } catch (error) {
    console.error("File upload validation failed:", error);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    return res.status(500).json({ message: "Failed to validate the uploaded file." });
  }
};

// ── Existing routes with error handling ───────────────────────────────────────

router.post("/create", protect, allowRoles("teacher"), asyncHandler(createAssignment));

// Single robust submit route (removed the duplicate conflicting one)
router.post(
  "/submit/:id",
  protect,
  allowRoles("student"),
  // Wrapper middleware to gracefully handle multer validation errors (like file size)
  (req, res, next) => {
    upload.single("file")(req, res, (err) => {
      if (err) {
        return res.status(400).json({ message: err.message });
      }
      next();
    });
  },
  validateUploadedFile,
  submitAssignment
);

router.get("/download/:filename", protect, downloadAssignmentFile);

router.post(
  "/evaluate/:id",
  protect,
  allowRoles("teacher"),
  asyncHandler(evaluateAssignment)
);
router.get("/teacher", protect, allowRoles("teacher", "hod"), getTeacherAssignments);

// get assignments for a course
// Student assignments (course-wise)
router.get("/student", protect, allowRoles("student","teacher","parent"), async (req, res) => {
  try {
    const assignments = await Assignment.find()
      .populate("course", "name code")
      .populate("teacher", "name")
      .populate("comments.user", "name role avatarUrl photo"); 
    res.json({ success: true, data: assignments });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Fixed the nested route bug here
router.get(
  "/teacher/submissions/:assignmentId",
  protect,
  allowRoles("teacher", "hod"),
  asyncHandler(async (req, res) => {
    const { assignmentId } = req.params;
    log.request("GET", `/api/assignment/teacher/submissions/${assignmentId}`, req.user?.id);

    if (!assignmentId) {
      throw new AppError("Assignment ID is required", 400, "MISSING_ID");
    }

    const assignment = await Assignment.findById(assignmentId)
      .populate(
        "submissions.student",
        "name email avatarUrl photo profilePicture department rollNumber"
      )
      .populate("course", "name code");

    if (!assignment) {
      throw new AppError("Assignment not found", 404, "NOT_FOUND");
    }
    
    res.json({ success: true, data: assignment });
  })
);

router.get(
  "/reminders",
  protect,
  allowRoles("student"),
  asyncHandler(getUpcomingAssignments)
);

// The new StackOverflow-style Comments Route!
router.post("/:id/comments", protect, asyncHandler(addAssignmentComment));

export default router;