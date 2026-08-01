// src/controllers/resume.controller.js
import { validateResume, getFileInfo, sanitizeFilename } from '../utils/fileValidators.js';
import fs from 'fs';

/**
 * Extract text from resume file
 * (Replace with your actual resume parsing logic)
 */
async function extractResumeText(file) {
  // TODO: Implement actual resume text extraction
  // This is a placeholder - replace with your actual logic
  return "Resume text extracted successfully";
}

/**
 * Handle Resume Analysis with Security Validation
 * POST /api/resume/analyze
 */
export async function handleAnalyzeResume(req, res) {
  try {
    // ✅ File validation BEFORE processing (Security fix)
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'Resume file is required',
        code: 'FILE_REQUIRED'
      });
    }

    // ✅ Comprehensive validation
    const validation = validateResume(req.file);
    
    if (!validation.valid) {
      // ✅ Clean up malicious file
      if (req.file.path && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      
      return res.status(400).json({
        success: false,
        error: validation.error,
        code: 'INVALID_FILE'
      });
    }

    // ✅ Log file info for audit
    const fileInfo = getFileInfo(req.file);
    console.log(`[Resume Upload] File validated: ${fileInfo.originalName} (${fileInfo.sizeInMB}MB, ${fileInfo.mimeType})`);

    // ✅ Sanitize filename
    const safeFilename = sanitizeFilename(req.file.originalname);

    // Now process the validated file
    const text = await extractResumeText(req.file);
    
    // Process resume text...
    // ... your existing logic

    res.json({
      success: true,
      message: 'Resume analyzed successfully',
      fileInfo: {
        originalName: fileInfo.originalName,
        size: fileInfo.sizeInMB + 'MB',
        type: fileInfo.mimeType,
        safeFilename: safeFilename
      },
      data: {
        text: text
        // ... rest of your data
      }
    });

  } catch (error) {
    console.error('[Resume Analysis] Error:', error);
    
    // Clean up file on error
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (e) {
        console.error('[Resume Analysis] Cleanup error:', e);
      }
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to analyze resume',
      code: 'ANALYSIS_FAILED'
    });
  }
}

/**
 * Get resume analysis status
 * GET /api/resume/status/:id
 */
export async function getResumeStatus(req, res) {
  try {
    const { id } = req.params;
    
    // TODO: Implement status check logic
    
    res.json({
      success: true,
      data: {
        id: id,
        status: 'completed',
        message: 'Resume analysis completed'
      }
    });
  } catch (error) {
    console.error('[Resume Status] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get resume status'
    });
  }
}

export default {
  handleAnalyzeResume,
  getResumeStatus
};