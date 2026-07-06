import AuditLog from "../models/AuditLog.model.js";

/**
 * Logs an action to the AuditLog collection.
 * 
 * @param {string} userId - ID of the user performing the action
 * @param {string} action - The action being performed (e.g., 'CREATE', 'UPDATE', 'DELETE', 'LOGIN')
 * @param {string} module - The module affected (e.g., 'Student', 'Attendance', 'Auth')
 * @param {string} target - The identifier of the affected record (e.g., studentId, email)
 * @param {Object} details - Additional contextual information (e.g., old vs new values)
 */
export const logAction = async (userId, action, module, target, details = {}) => {
  try {
    if (!userId) {
      console.warn("Audit log warning: userId is missing.");
      return;
    }

    await AuditLog.create({
      user: userId,
      action,
      module,
      target: target?.toString() || "Unknown",
      details,
    });
  } catch (error) {
    console.error("Failed to create audit log:", error);
  }
};
