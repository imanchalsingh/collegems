/**
 * File Validation Utilities
 * Comprehensive file type validation with security integration
 */

import path from 'path';
import fs from 'fs';

// ============================================
// CONFIGURATION
// ============================================

export const FILE_CONFIG = {
  // Allowed MIME types for resumes
  ALLOWED_RESUME_MIME_TYPES: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'application/rtf',
    'application/vnd.oasis.opendocument.text'
  ],
  
  // Allowed file extensions for resumes
  ALLOWED_RESUME_EXTENSIONS: [
    '.pdf', '.doc', '.docx', '.txt', '.rtf', '.odt'
  ],
  
  // Maximum file size (5MB default)
  MAX_FILE_SIZE: 5 * 1024 * 1024,
  
  // Maximum file size for resumes (10MB)
  MAX_RESUME_SIZE: 10 * 1024 * 1024,
  
  // Allowed MIME types for general uploads
  ALLOWED_GENERAL_MIME_TYPES: [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'application/zip',
    'application/x-zip-compressed'
  ],
  
  // Allowed extensions for general uploads
  ALLOWED_GENERAL_EXTENSIONS: [
    '.jpg', '.jpeg', '.png', '.gif', '.webp',
    '.pdf', '.doc', '.docx', '.txt', '.zip'
  ]
};

// ============================================
// VALIDATION FUNCTIONS
// ============================================

/**
 * Validate file type based on MIME type
 */
export const validateFileType = (file, allowedMimeTypes) => {
  if (!file || !file.mimetype) {
    return { valid: false, error: 'File is required' };
  }

  if (!allowedMimeTypes.includes(file.mimetype)) {
    return {
      valid: false,
      error: `Invalid file type. Allowed: ${allowedMimeTypes.join(', ')}`
    };
  }

  return { valid: true };
};

/**
 * Validate file extension
 */
export const validateFileExtension = (file, allowedExtensions) => {
  if (!file || !file.originalname) {
    return { valid: false, error: 'File is required' };
  }

  const ext = path.extname(file.originalname).toLowerCase();
  
  if (!allowedExtensions.includes(ext)) {
    return {
      valid: false,
      error: `Invalid file extension. Allowed: ${allowedExtensions.join(', ')}`
    };
  }

  return { valid: true };
};

/**
 * Validate file size
 */
export const validateFileSize = (file, maxSize) => {
  if (!file || !file.size) {
    return { valid: false, error: 'File is required' };
  }

  if (file.size > maxSize) {
    const maxMB = maxSize / (1024 * 1024);
    return {
      valid: false,
      error: `File size exceeds ${maxMB}MB limit. Current size: ${(file.size / (1024 * 1024)).toFixed(2)}MB`
    };
  }

  return { valid: true };
};

/**
 * Check file for malicious content (basic)
 */
export const checkFileForMaliciousContent = (file) => {
  // Check for double extensions (e.g., .pdf.exe)
  const filename = file.originalname || '';
  const parts = filename.split('.');
  
  if (parts.length > 2) {
    const lastTwo = parts.slice(-2).join('.');
    const suspiciousExtensions = ['.exe', '.bat', '.cmd', '.sh', '.js', '.html', '.htm'];
    
    for (const ext of suspiciousExtensions) {
      if (filename.toLowerCase().includes(ext)) {
        return {
          valid: false,
          error: `Suspicious file name detected: ${filename}`
        };
      }
    }
  }

  // Check for null bytes in filename (security bypass attempt)
  if (filename.includes('\0')) {
    return {
      valid: false,
      error: 'Invalid file name detected'
    };
  }

  return { valid: true };
};

/**
 * Comprehensive file validation for resumes
 */
export const validateResume = (file) => {
  // Check if file exists
  if (!file) {
    return { valid: false, error: 'Resume file is required' };
  }

  // Check MIME type
  const mimeValidation = validateFileType(file, FILE_CONFIG.ALLOWED_RESUME_MIME_TYPES);
  if (!mimeValidation.valid) {
    return mimeValidation;
  }

  // Check extension
  const extValidation = validateFileExtension(file, FILE_CONFIG.ALLOWED_RESUME_EXTENSIONS);
  if (!extValidation.valid) {
    return extValidation;
  }

  // Check size
  const sizeValidation = validateFileSize(file, FILE_CONFIG.MAX_RESUME_SIZE);
  if (!sizeValidation.valid) {
    return sizeValidation;
  }

  // Check for malicious content
  const maliciousCheck = checkFileForMaliciousContent(file);
  if (!maliciousCheck.valid) {
    return maliciousCheck;
  }

  // Additional: Check if file is actually readable (not corrupted)
  if (file.path && !fs.existsSync(file.path)) {
    return { valid: false, error: 'File is corrupted or unreadable' };
  }

  return { valid: true };
};

/**
 * Validate general file upload
 */
export const validateGeneralFile = (file) => {
  if (!file) {
    return { valid: false, error: 'File is required' };
  }

  const mimeValidation = validateFileType(file, FILE_CONFIG.ALLOWED_GENERAL_MIME_TYPES);
  if (!mimeValidation.valid) {
    return mimeValidation;
  }

  const extValidation = validateFileExtension(file, FILE_CONFIG.ALLOWED_GENERAL_EXTENSIONS);
  if (!extValidation.valid) {
    return extValidation;
  }

  const sizeValidation = validateFileSize(file, FILE_CONFIG.MAX_FILE_SIZE);
  if (!sizeValidation.valid) {
    return sizeValidation;
  }

  const maliciousCheck = checkFileForMaliciousContent(file);
  if (!maliciousCheck.valid) {
    return maliciousCheck;
  }

  return { valid: true };
};

/**
 * Get file info for logging/audit
 */
export const getFileInfo = (file) => {
  if (!file) return null;
  
  return {
    originalName: file.originalname,
    size: file.size,
    sizeInMB: (file.size / (1024 * 1024)).toFixed(2),
    mimeType: file.mimetype,
    extension: path.extname(file.originalname),
    uploadedAt: new Date().toISOString()
  };
};

/**
 * Sanitize filename for storage
 */
export const sanitizeFilename = (filename) => {
  if (!filename) return 'file';
  
  // Remove path traversal attempts
  let sanitized = filename.replace(/\.\./g, '');
  
  // Remove special characters
  sanitized = sanitized.replace(/[^a-zA-Z0-9.\- _]/g, '');
  
  // Limit length
  if (sanitized.length > 200) {
    const ext = path.extname(sanitized);
    const name = sanitized.substring(0, 200 - ext.length);
    sanitized = name + ext;
  }
  
  return sanitized;
};

/**
 * Validate file against all security rules
 * (Combines Helmet-like security with file validation)
 */
export const validateFileSecurely = (file, options = {}) => {
  const {
    allowedMimeTypes = FILE_CONFIG.ALLOWED_RESUME_MIME_TYPES,
    allowedExtensions = FILE_CONFIG.ALLOWED_RESUME_EXTENSIONS,
    maxSize = FILE_CONFIG.MAX_RESUME_SIZE,
    checkMalicious = true,
    sanitize = true
  } = options;

  const errors = [];

  // 1. MIME type validation
  const mimeValidation = validateFileType(file, allowedMimeTypes);
  if (!mimeValidation.valid) {
    errors.push(mimeValidation.error);
  }

  // 2. Extension validation
  const extValidation = validateFileExtension(file, allowedExtensions);
  if (!extValidation.valid) {
    errors.push(extValidation.error);
  }

  // 3. Size validation
  const sizeValidation = validateFileSize(file, maxSize);
  if (!sizeValidation.valid) {
    errors.push(sizeValidation.error);
  }

  // 4. Malicious content check
  if (checkMalicious) {
    const maliciousCheck = checkFileForMaliciousContent(file);
    if (!maliciousCheck.valid) {
      errors.push(maliciousCheck.error);
    }
  }

  // 5. Sanitize filename
  let sanitizedFilename = file.originalname;
  if (sanitize) {
    sanitizedFilename = sanitizeFilename(file.originalname);
  }

  return {
    valid: errors.length === 0,
    errors,
    sanitizedFilename,
    fileInfo: getFileInfo(file)
  };
};

// ============================================
// EXPRESS MIDDLEWARE
// ============================================

/**
 * Middleware to validate resume file
 * Use this in routes before processing the file
 */
export const validateResumeMiddleware = (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'Resume file is required'
      });
    }

    const validation = validateResume(req.file);
    
    if (!validation.valid) {
      // Delete the uploaded file if validation fails
      if (req.file.path && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      
      return res.status(400).json({
        success: false,
        error: validation.error
      });
    }

    // Attach validation info to request
    req.fileValidation = {
      valid: true,
      fileInfo: getFileInfo(req.file),
      sanitizedFilename: sanitizeFilename(req.file.originalname)
    };

    next();
  } catch (error) {
    console.error('[FileValidation] Middleware error:', error);
    
    // Clean up file if error occurs
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({
      success: false,
      error: 'File validation failed'
    });
  }
};

/**
 * Middleware to validate general file upload
 */
export const validateGeneralFileMiddleware = (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'File is required'
      });
    }

    const validation = validateGeneralFile(req.file);
    
    if (!validation.valid) {
      if (req.file.path && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      
      return res.status(400).json({
        success: false,
        error: validation.error
      });
    }

    req.fileValidation = {
      valid: true,
      fileInfo: getFileInfo(req.file),
      sanitizedFilename: sanitizeFilename(req.file.originalname)
    };

    next();
  } catch (error) {
    console.error('[FileValidation] Middleware error:', error);
    
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({
      success: false,
      error: 'File validation failed'
    });
  }
};

// ============================================
// EXPORTS
// ============================================

export default {
  FILE_CONFIG,
  validateFileType,
  validateFileExtension,
  validateFileSize,
  checkFileForMaliciousContent,
  validateResume,
  validateGeneralFile,
  validateFileSecurely,
  getFileInfo,
  sanitizeFilename,
  validateResumeMiddleware,
  validateGeneralFileMiddleware
};