// src/routes/resume.routes.js
import express from 'express';
import multer from 'multer';
import { validateResumeMiddleware } from '../utils/fileValidators.js';
import { handleAnalyzeResume, getResumeStatus } from '../controllers/resume.controller.js';

const router = express.Router();

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Ensure directory exists
    const dir = 'secure-uploads/temp/';
    if (!require('fs').existsSync(dir)) {
      require('fs').mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = require('path').extname(file.originalname);
    cb(null, unique + ext);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  }
});

// ✅ Route with file validation middleware
router.post(
  '/analyze',
  upload.single('resume'),
  validateResumeMiddleware,
  handleAnalyzeResume
);

// Get resume status
router.get('/status/:id', getResumeStatus);

export default router;