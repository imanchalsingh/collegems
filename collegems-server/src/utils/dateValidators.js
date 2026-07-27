/**
 * Date Validation Utilities
 * Centralized date validation functions for the application
 */

// ============================================
// DATE VALIDATION FUNCTIONS
// ============================================

/**
 * Check if a string is a valid date format
 * Supports: YYYY-MM-DD, YYYY/MM/DD, MM-DD-YYYY, MM/DD/YYYY
 */
export const isValidDateFormat = (dateString) => {
  if (!dateString || typeof dateString !== 'string') {
    return false;
  }

  const trimmed = dateString.trim();
  if (trimmed.length === 0) {
    return false;
  }

  // Try multiple date formats
  const formats = [
    /^\d{4}-\d{2}-\d{2}$/, // YYYY-MM-DD
    /^\d{4}\/\d{2}\/\d{2}$/, // YYYY/MM/DD
    /^\d{2}-\d{2}-\d{4}$/, // MM-DD-YYYY
    /^\d{2}\/\d{2}\/\d{4}$/ // MM/DD/YYYY
  ];

  let isValidFormat = false;
  let parsedDate = null;

  for (const format of formats) {
    if (format.test(trimmed)) {
      isValidFormat = true;
      break;
    }
  }

  if (!isValidFormat) {
    return false;
  }

  // Parse the date
  parsedDate = new Date(trimmed);
  if (isNaN(parsedDate.getTime())) {
    return false;
  }

  return true;
};

/**
 * Validate date range - check if start date is before end date
 */
export const isValidDateRange = (startDate, endDate) => {
  if (!startDate || !endDate) {
    return false;
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return false;
  }

  // Check if start is before or equal to end
  return start <= end;
};

/**
 * Check if a date is in the future
 */
export const isFutureDate = (dateString) => {
  if (!dateString) {
    return false;
  }

  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    return false;
  }

  const now = new Date();
  return date > now;
};

/**
 * Check if a date is in the past
 */
export const isPastDate = (dateString) => {
  if (!dateString) {
    return false;
  }

  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    return false;
  }

  const now = new Date();
  return date < now;
};

/**
 * Check if a date is today
 */
export const isToday = (dateString) => {
  if (!dateString) {
    return false;
  }

  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    return false;
  }

  const today = new Date();
  return date.getFullYear() === today.getFullYear() &&
         date.getMonth() === today.getMonth() &&
         date.getDate() === today.getDate();
};

/**
 * Check if two dates are on the same day
 */
export const isSameDay = (date1, date2) => {
  if (!date1 || !date2) {
    return false;
  }

  const d1 = new Date(date1);
  const d2 = new Date(date2);

  if (isNaN(d1.getTime()) || isNaN(d2.getTime())) {
    return false;
  }

  return d1.getFullYear() === d2.getFullYear() &&
         d1.getMonth() === d2.getMonth() &&
         d1.getDate() === d2.getDate();
};

/**
 * Get difference between two dates in days
 */
export const getDaysDifference = (date1, date2) => {
  if (!date1 || !date2) {
    return 0;
  }

  const d1 = new Date(date1);
  const d2 = new Date(date2);

  if (isNaN(d1.getTime()) || isNaN(d2.getTime())) {
    return 0;
  }

  const diffTime = Math.abs(d2 - d1);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

/**
 * Format date to string (YYYY-MM-DD)
 */
export const formatDate = (date) => {
  if (!date) {
    return null;
  }

  const d = new Date(date);
  if (isNaN(d.getTime())) {
    return null;
  }

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

/**
 * Get current date as string (YYYY-MM-DD)
 */
export const getCurrentDate = () => {
  return formatDate(new Date());
};

/**
 * Get start of day
 */
export const getStartOfDay = (date) => {
  if (!date) {
    return null;
  }

  const d = new Date(date);
  if (isNaN(d.getTime())) {
    return null;
  }

  d.setHours(0, 0, 0, 0);
  return d;
};

/**
 * Get end of day
 */
export const getEndOfDay = (date) => {
  if (!date) {
    return null;
  }

  const d = new Date(date);
  if (isNaN(d.getTime())) {
    return null;
  }

  d.setHours(23, 59, 59, 999);
  return d;
};

/**
 * Get start of week (Monday)
 */
export const getStartOfWeek = (date) => {
  if (!date) {
    return null;
  }

  const d = new Date(date);
  if (isNaN(d.getTime())) {
    return null;
  }

  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
};

/**
 * Get end of week (Sunday)
 */
export const getEndOfWeek = (date) => {
  if (!date) {
    return null;
  }

  const start = getStartOfWeek(date);
  if (!start) {
    return null;
  }

  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
};

/**
 * Get start of month
 */
export const getStartOfMonth = (date) => {
  if (!date) {
    return null;
  }

  const d = new Date(date);
  if (isNaN(d.getTime())) {
    return null;
  }

  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
};

/**
 * Get end of month
 */
export const getEndOfMonth = (date) => {
  if (!date) {
    return null;
  }

  const d = new Date(date);
  if (isNaN(d.getTime())) {
    return null;
  }

  d.setMonth(d.getMonth() + 1);
  d.setDate(0);
  d.setHours(23, 59, 59, 999);
  return d;
};

/**
 * Parse date safely
 */
export const parseDate = (dateString) => {
  if (!dateString || typeof dateString !== 'string') {
    return null;
  }

  const trimmed = dateString.trim();
  const date = new Date(trimmed);
  
  if (isNaN(date.getTime())) {
    return null;
  }

  return date;
};

/**
 * Check if date is valid (combination of format and range)
 */
export const isValidDate = (dateString, options = {}) => {
  const { allowFuture = true, allowPast = true, minDate = null, maxDate = null } = options;

  // Check format
  if (!isValidDateFormat(dateString)) {
    return { valid: false, error: 'Invalid date format' };
  }

  const date = new Date(dateString);
  const now = new Date();

  // Check future/past
  if (!allowFuture && date > now) {
    return { valid: false, error: 'Date cannot be in the future' };
  }

  if (!allowPast && date < now) {
    return { valid: false, error: 'Date cannot be in the past' };
  }

  // Check min date
  if (minDate) {
    const min = new Date(minDate);
    if (date < min) {
      return { valid: false, error: `Date must be after ${formatDate(minDate)}` };
    }
  }

  // Check max date
  if (maxDate) {
    const max = new Date(maxDate);
    if (date > max) {
      return { valid: false, error: `Date must be before ${formatDate(maxDate)}` };
    }
  }

  return { valid: true };
};

// ============================================
// EXPORTS
// ============================================

export default {
  isValidDateFormat,
  isValidDateRange,
  isFutureDate,
  isPastDate,
  isToday,
  isSameDay,
  getDaysDifference,
  formatDate,
  getCurrentDate,
  getStartOfDay,
  getEndOfDay,
  getStartOfWeek,
  getEndOfWeek,
  getStartOfMonth,
  getEndOfMonth,
  parseDate,
  isValidDate
};