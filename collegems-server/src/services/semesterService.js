import Semester from "../models/Semester.model.js";

/**
 * Checks if a semester is frozen and throws an error if it is.
 * @param {string|number} semesterStr The semester to check.
 * @throws {Error} If the semester is frozen.
 */
export const checkSemesterFrozen = async (semesterStr) => {
  if (!semesterStr) return; // If no semester is provided, we can't check
  
  const semesterStrVal = String(semesterStr);
  const semesterObj = await Semester.findOne({ semester: semesterStrVal });

  if (semesterObj && semesterObj.isFrozen) {
    const error = new Error(`Modifications are not allowed because Semester ${semesterStrVal} is frozen and marked as completed.`);
    error.status = 403;
    throw error;
  }
};

/**
 * Returns the currently active academic session, or null if none exists.
 * Useful for controllers that need to auto-fill the semester on new records.
 * @returns {Promise<import('../models/Semester.model.js').default|null>}
 */
export const getActiveSession = async () => {
  return Semester.findOne({ isActive: true }).lean();
};

