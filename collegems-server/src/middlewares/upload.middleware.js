// ─── FILE: collegems-server/src/middlewares/upload.middleware.js ───────────────────────
import multer from "multer";
import fs from "fs";
import path from "path";

// Ensure the secure-uploads/assignments directory exists
const secureAssignmentsDir = path.join(process.cwd(), "secure-uploads", "assignments");
fs.mkdirSync(secureAssignmentsDir, { recursive: true });

// Ensure the secure-uploads/resumes directory exists (for future use)
const secureResumesDir = path.join(process.cwd(), "secure-uploads", "resumes");
fs.mkdirSync(secureResumesDir, { recursive: true });

// 1. Storage Configuration for Assignments (secure location)
const assignmentStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, secureAssignmentsDir);
  },
  filename: (req, file, cb) => {
    // Generate a unique filename without spaces
    const timestamp = Date.now();
    const sanitized = file.originalname.replace(/\s+/g, "-");
    cb(null, `assignment-${timestamp}-${sanitized}`);
  },
});


// Shared File Type Filter (PDFs and Word Docs only)
const documentFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Invalid file type. Only PDF and Word documents are allowed."), false);
  }
};

// Exported Multer upload handlers
export const uploadAssignment = multer({
  storage: assignmentStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB limit (adjustable)
  fileFilter: documentFilter,
});

// Resume Upload Middleware Configuration
const resumeStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/resumes/");
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname.replace(/\s+/g, '-')}`); 
  },
});

const resumeFilter = (req, file, cb) => {
  const allowedMimeTypes = ["application/pdf"];
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only PDF documents are allowed."), false);
  }
};

export const uploadResume = multer({
  storage: resumeStorage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: resumeFilter,
});
