import User from "../models/User.model.js";

/**
 * Checks if a proposed user payload potentially conflicts with existing records.
 * Returns an array of matches. Empty array means no duplicates found.
 */
export const checkPotentialDuplicates = async (userData) => {
  const { email, studentId, teacherId, phone, name, dob } = userData;
  
  const orConditions = [];

  if (email) {
    orConditions.push({ email: email.trim().toLowerCase() });
  }
  
  if (studentId) {
    orConditions.push({ studentId: studentId.trim() });
  }

  if (teacherId) {
    orConditions.push({ teacherId: teacherId.trim() });
  }

  if (phone) {
    orConditions.push({ phone: phone.trim() });
  }

  if (name) {
    orConditions.push({ name: new RegExp(`^${name.trim()}$`, "i") });
  }

  if (orConditions.length === 0) {
    return [];
  }

  const duplicates = await User.find({ $or: orConditions })
    .select("name email studentId teacherId phone dob role")
    .lean();

  return duplicates.map(dup => {
    const reasons = [];
    if (email && dup.email === email.trim().toLowerCase()) reasons.push("Email");
    if (studentId && dup.studentId === studentId.trim()) reasons.push("Student ID");
    if (teacherId && dup.teacherId === teacherId.trim()) reasons.push("Teacher ID");
    if (phone && dup.phone === phone.trim()) reasons.push("Phone");
    if (name && dup.name.toLowerCase() === name.trim().toLowerCase()) {
      if (dob && dup.dob) {
        const dbDate = new Date(dup.dob);
        const inputDate = new Date(dob);
        if (dbDate.getUTCFullYear() === inputDate.getUTCFullYear() &&
            dbDate.getUTCMonth() === inputDate.getUTCMonth() &&
            dbDate.getUTCDate() === inputDate.getUTCDate()) {
          reasons.push("Name & DOB");
        } else {
          reasons.push("Name");
        }
      } else {
        reasons.push("Name");
      }
    }

    return {
      ...dup,
      matchReason: reasons.join(", ")
    };
  });
};
