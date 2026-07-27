/**
 * Assignment Validation Utilities
 * Centralized validation functions for assignment operations
 */

import mongoose from 'mongoose';

// ============================================
// VALIDATION FUNCTIONS
// ============================================

/**
 * Validate Course ID
 */
export const validateCourseId = (courseId) => {
  if (!courseId) {
    return { valid: false, error: 'Course ID is required' };
  }
  
  if (!mongoose.Types.ObjectId.isValid(courseId)) {
    return { valid: false, error: 'Invalid Course ID format' };
  }
  
  return { valid: true, value: courseId };
};

/**
 * Validate Total Points
 */
export const validateTotalPoints = (totalPoints) => {
  if (totalPoints === undefined || totalPoints === null) {
    return { valid: false, error: 'Total points are required' };
  }
  
  const numericPoints = Number(totalPoints);
  
  if (isNaN(numericPoints)) {
    return { valid: false, error: 'Total points must be a number' };
  }
  
  if (numericPoints <= 0) {
    return { valid: false, error: 'Total points must be greater than 0' };
  }
  
  if (numericPoints > 1000) {
    return { valid: false, error: 'Total points cannot exceed 1000' };
  }
  
  return { valid: true, value: numericPoints };
};

/**
 * Validate Assignment Title
 */
export const validateTitle = (title) => {
  if (!title || typeof title !== 'string') {
    return { valid: false, error: 'Title is required and must be a string' };
  }
  
  const trimmed = title.trim();
  
  if (trimmed.length === 0) {
    return { valid: false, error: 'Title cannot be empty' };
  }
  
  if (trimmed.length < 3) {
    return { valid: false, error: 'Title must be at least 3 characters' };
  }
  
  if (trimmed.length > 200) {
    return { valid: false, error: 'Title cannot exceed 200 characters' };
  }
  
  return { valid: true, value: trimmed };
};

/**
 * Validate Description
 */
export const validateDescription = (description) => {
  if (!description || typeof description !== 'string') {
    return { valid: false, error: 'Description is required and must be a string' };
  }
  
  const trimmed = description.trim();
  
  if (trimmed.length === 0) {
    return { valid: false, error: 'Description cannot be empty' };
  }
  
  if (trimmed.length < 10) {
    return { valid: false, error: 'Description must be at least 10 characters' };
  }
  
  if (trimmed.length > 5000) {
    return { valid: false, error: 'Description cannot exceed 5000 characters' };
  }
  
  return { valid: true, value: trimmed };
};

/**
 * Validate Due Date
 */
export const validateDueDate = (dueDate) => {
  if (!dueDate) {
    return { valid: false, error: 'Due date is required' };
  }
  
  const date = new Date(dueDate);
  
  if (isNaN(date.getTime())) {
    return { valid: false, error: 'Invalid due date format' };
  }
  
  const now = new Date();
  if (date < now) {
    return { valid: false, error: 'Due date must be in the future' };
  }
  
  return { valid: true, value: date };
};

/**
 * Validate Submission Type
 */
export const validateSubmissionType = (submissionType) => {
  const allowedTypes = ['file', 'text', 'link', 'both'];
  
  if (!submissionType) {
    return { valid: false, error: 'Submission type is required' };
  }
  
  if (!allowedTypes.includes(submissionType)) {
    return { 
      valid: false, 
      error: `Invalid submission type. Allowed: ${allowedTypes.join(', ')}` 
    };
  }
  
  return { valid: true, value: submissionType };
};

/**
 * Validate File (for submission)
 */
export const validateFile = (file, maxSize = 10 * 1024 * 1024) => {
  if (!file) {
    return { valid: false, error: 'File is required' };
  }
  
  const allowedMimeTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'image/jpeg',
    'image/png',
    'application/zip',
    'application/x-zip-compressed'
  ];
  
  // Validate file size
  if (file.size > maxSize) {
    return { 
      valid: false, 
      error: `File size exceeds ${maxSize / (1024 * 1024)}MB limit` 
    };
  }
  
  // Validate mime type
  if (!allowedMimeTypes.includes(file.mimetype)) {
    return { 
      valid: false, 
      error: `Invalid file type. Allowed: ${allowedMimeTypes.join(', ')}` 
    };
  }
  
  return { valid: true, value: file };
};

/**
 * Validate Link
 */
export const validateLink = (link) => {
  if (!link || typeof link !== 'string') {
    return { valid: false, error: 'Link is required and must be a string' };
  }
  
  const trimmed = link.trim();
  
  if (trimmed.length === 0) {
    return { valid: false, error: 'Link cannot be empty' };
  }
  
  try {
    const url = new URL(trimmed);
    
    // Check protocol
    if (!['http:', 'https:'].includes(url.protocol)) {
      return { valid: false, error: 'Link must use HTTP or HTTPS protocol' };
    }
    
    return { valid: true, value: trimmed };
  } catch (error) {
    return { valid: false, error: 'Invalid URL format' };
  }
};

/**
 * Validate Text Submission
 */
export const validateTextSubmission = (text) => {
  if (!text || typeof text !== 'string') {
    return { valid: false, error: 'Text submission is required and must be a string' };
  }
  
  const trimmed = text.trim();
  
  if (trimmed.length === 0) {
    return { valid: false, error: 'Text submission cannot be empty' };
  }
  
  if (trimmed.length < 10) {
    return { valid: false, error: 'Text must be at least 10 characters' };
  }
  
  if (trimmed.length > 10000) {
    return { valid: false, error: 'Text cannot exceed 10000 characters' };
  }
  
  return { valid: true, value: trimmed };
};

/**
 * Validate Marks
 */
export const validateMarks = (marks, totalPoints) => {
  if (marks === undefined || marks === null) {
    return { valid: false, error: 'Marks are required' };
  }
  
  const numericMarks = Number(marks);
  
  if (isNaN(numericMarks)) {
    return { valid: false, error: 'Marks must be a number' };
  }
  
  if (numericMarks < 0) {
    return { valid: false, error: 'Marks cannot be negative' };
  }
  
  if (numericMarks > totalPoints) {
    return { 
      valid: false, 
      error: `Marks cannot exceed total points (${totalPoints})` 
    };
  }
  
  return { valid: true, value: numericMarks };
};

/**
 * Validate Comment
 */
export const validateComment = (comment) => {
  if (!comment || typeof comment !== 'string') {
    return { valid: false, error: 'Comment is required and must be a string' };
  }
  
  const trimmed = comment.trim();
  
  if (trimmed.length === 0) {
    return { valid: false, error: 'Comment cannot be empty' };
  }
  
  if (trimmed.length > 2000) {
    return { valid: false, error: 'Comment cannot exceed 2000 characters' };
  }
  
  return { valid: true, value: trimmed };
};

/**
 * Validate Assignment ID
 */
export const validateAssignmentId = (assignmentId) => {
  if (!assignmentId) {
    return { valid: false, error: 'Assignment ID is required' };
  }
  
  if (!mongoose.Types.ObjectId.isValid(assignmentId)) {
    return { valid: false, error: 'Invalid Assignment ID format' };
  }
  
  return { valid: true, value: assignmentId };
};

/**
 * Validate Submission ID
 */
export const validateSubmissionId = (submissionId) => {
  if (!submissionId) {
    return { valid: false, error: 'Submission ID is required' };
  }
  
  if (!mongoose.Types.ObjectId.isValid(submissionId)) {
    return { valid: false, error: 'Invalid Submission ID format' };
  }
  
  return { valid: true, value: submissionId };
};

/**
 * Sanitize input string (XSS protection)
 */
export const sanitizeString = (input) => {
  if (!input || typeof input !== 'string') return '';
  return input.trim().replace(/[<>{}]/g, '');
};

// ============================================
// EXPORTS
// ============================================

export default {
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
};