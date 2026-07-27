// ─── FILE: collegems-server/src/routes/resume.routes.js ──────────────────────

import express from "express";
import fs from "fs";
import path from "path";
import multer from "multer";
import { protect } from "../middlewares/auth.middleware.js";
import { allowRoles } from "../middlewares/role.middleware.js";
import { asyncHandler } from "../middlewares/errorHandler.middleware.js";
import { verifyFileSignature, scanFileForMalware } from "../utils/malwareScanner.js";
import User from "../models/User.model.js";

const router = express.Router();

// ── Upload directory (outside the web-served root) ───────────────────────────
const uploadsDir = path.join(process.cwd(), "secure-uploads", "resumes");
fs.mkdirSync(uploadsDir, { recursive: true });

// ── Allowed MIME types for resume documents ───────────────────────────────────
const ALLOWED_MIME_TYPES = {
  "application/pdf": [".pdf"],
  "application/msword": [".doc"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
};

// ── Multer storage: server-generated filenames, never trust user input ────────
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB – resumes don't need more
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedExtensions = ALLOWED_MIME_TYPES[file.mimetype];

    if (allowedExtensions && allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          "File type not allowed. Resumes must be .pdf, .doc, or .docx."
        ),
        false
      );
    }
  },
});

// ── Security middleware: magic-byte check + malware scan ──────────────────────
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
      return res
        .status(400)
        .json({ message: "File contents do not match the declared extension." });
    }

    // 2. Scan for malware
    const scanResult = await scanFileForMalware(filePath);
    if (!scanResult.safe) {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      return res
        .status(400)
        .json({ message: `Security threat detected: ${scanResult.reason}` });
    }

    next();
  } catch (error) {
    console.error("Resume upload validation failed:", error);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    return res
      .status(500)
      .json({ message: "Failed to validate the uploaded file." });
  }
};

// ── Routes ────────────────────────────────────────────────────────────────────

/**
 * POST /api/resume/upload
 * Upload or replace the authenticated user's resume.
 * Only students and alumni may upload a resume.
 */
router.post(
  "/upload",
  protect,
  allowRoles("student", "alumni"),
  // Wrap multer so validation errors (size, type) return a clean JSON 400
  (req, res, next) => {
    upload.single("resume")(req, res, (err) => {
      if (err) {
        return res.status(400).json({ message: err.message });
      }
      next();
    });
  },
  validateUploadedFile,
  asyncHandler(async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded." });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      // Clean up the just-uploaded file before responding
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(404).json({ message: "User not found." });
    }

    // Delete the old resume file from disk if one exists
    if (user.resumeUrl) {
      const oldFilePath = path.join(process.cwd(), user.resumeUrl);
      if (fs.existsSync(oldFilePath)) {
        fs.unlinkSync(oldFilePath);
      }
    }

    // Store a relative path so the server root can change without breaking records
    const relativeResumePath = path.relative(
      process.cwd(),
      req.file.path
    );
    user.resumeUrl = relativeResumePath;
    await user.save();

    res.status(200).json({
      message: "Resume uploaded successfully.",
      resumeUrl: relativeResumePath,
    });
  })
);

/**
 * GET /api/resume/me
 * Retrieve the authenticated user's current resume URL.
 */
router.get(
  "/me",
  protect,
  allowRoles("student", "alumni"),
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.id).select("resumeUrl");
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    if (!user.resumeUrl) {
      return res.status(404).json({ message: "No resume found for this user." });
    }

    res.status(200).json({ resumeUrl: user.resumeUrl });
  })
);

/**
 * DELETE /api/resume/me
 * Delete the authenticated user's resume from disk and clear the stored URL.
 */
router.delete(
  "/me",
  protect,
  allowRoles("student", "alumni"),
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    if (!user.resumeUrl) {
      return res.status(404).json({ message: "No resume found to delete." });
    }

    const filePath = path.join(process.cwd(), user.resumeUrl);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    user.resumeUrl = undefined;
    await user.save();

    res.status(200).json({ message: "Resume deleted successfully." });
  })
);

export default router;
