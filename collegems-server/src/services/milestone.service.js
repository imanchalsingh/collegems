import User from "../models/User.model.js";
import Course from "../models/Course.model.js";
import StudentTimelineEvent from "../models/StudentTimelineEvent.model.js";
import Attendance from "../models/Attendance.model.js";
import Assignment from "../models/Assignment.model.js";
import Results from "../models/Results.model.js";
import Fee from "../models/Fee.model.js";
import Leave from "../models/Leave.model.js";
import VerifiedCertificate from "../models/VerifiedCertificate.model.js";
import Achievement from "../models/Achievement.model.js";
import ExamSchedule from "../models/ExamSchedule.model.js";

/**
 * Aggregates student milestones from various entities.
 * @param {string} studentId - The ID of the student.
 * @param {object} options - Filtering and pagination options.
 * @param {number} options.page - Page number.
 * @param {number} options.limit - Number of records per page.
 * @param {string} [options.category] - Filter by category.
 * @param {string} [options.status] - Filter by status.
 * @param {string} [options.sort] - Sort order ('asc' or 'desc').
 * @returns {Promise<object>} The paginated milestones.
 */
export const getStudentMilestones = async (studentId, { page = 1, limit = 20, category, status, sort = "desc" }) => {
  const student = await User.findById(studentId);
  if (!student) {
    throw new Error("Student not found");
  }

  const milestones = [];

  const addMilestone = (id, title, cat, stat, date, description, redirectUrl, icon, color) => {
    milestones.push({
      id: String(id),
      title,
      category: cat,
      status: stat,
      date: date ? new Date(date) : new Date(),
      description,
      redirectUrl,
      icon,
      color,
    });
  };

  // 1. Registration & Admission
  if (student.createdAt) {
    addMilestone(
      `${student._id}_reg`,
      "Student Registration",
      "Registration",
      "Completed",
      student.createdAt,
      `Registered successfully in the system. Course: ${student.course || "N/A"}.`,
      "/student/profile",
      "Registration",
      "green"
    );

    addMilestone(
      `${student._id}_adm`,
      "Admission Confirmed",
      "Admission",
      "Completed",
      student.createdAt,
      `Admission confirmed for course ${student.course || "N/A"}.`,
      "/student/profile",
      "Admission",
      "green"
    );
  }

  // 2. Semester Records
  const timelineEvents = await StudentTimelineEvent.find({ student: studentId, field: "semester" }).lean();
  for (const ev of timelineEvents) {
    addMilestone(
      ev._id,
      "Semester Updated",
      "Semester",
      "Completed",
      ev.timestamp || ev.createdAt,
      `Promoted from ${ev.oldValue || "N/A"} to ${ev.newValue}.`,
      "/student/dashboard",
      "Semester",
      "green"
    );
  }

  // 3. Attendance
  const attendances = await Attendance.find({ student: studentId }).populate("course").lean();
  for (const att of attendances) {
    const isPresent = att.status === "present";
    addMilestone(
      att._id,
      `Attendance: ${isPresent ? "Present" : "Absent"}`,
      "Attendance",
      isPresent ? "Completed" : "Missed",
      att.date, // YYYY-MM-DD
      `Marked ${att.status} in ${att.course?.name || "Class"}${att.course?.code ? ` (${att.course.code})` : ""}.`,
      "/student/attendance",
      "Attendance",
      isPresent ? "green" : "red"
    );
  }

  // 4. Assignments
  const courseQuery = {
    $or: [
      ...(student.semester && !isNaN(Number(student.semester)) ? [{ semester: Number(student.semester) }] : []),
      ...(student.course ? [{ department: { $regex: `^${student.course}$`, $options: "i" } }] : []),
    ],
  };

  const relatedCourses = courseQuery.$or.length > 0 ? await Course.find(courseQuery).select("_id").lean() : [];
  const courseIds = relatedCourses.map((c) => c._id);

  const assignments = await Assignment.find(
    courseIds.length ? { course: { $in: courseIds } } : {}
  ).populate("course").lean();

  for (const assign of assignments) {
    const submission = assign.submissions?.find(
      (s) => s.student?.toString() === studentId.toString()
    );

    const hasSubmitted = submission && ["submitted", "graded", "draft"].includes(submission.status);
    const isPastDue = assign.dueDate && new Date(assign.dueDate) < new Date();

    let assignStatus = "Upcoming";
    let assignColor = "blue";
    let desc = `Assignment for ${assign.course?.name || "Course"}. Due on ${new Date(assign.dueDate).toLocaleDateString()}.`;

    if (hasSubmitted) {
      assignStatus = "Completed";
      assignColor = "green";
      desc = `Submitted assignment for ${assign.course?.name || "Course"}. Submitted on ${new Date(submission.submittedAt || assign.updatedAt).toLocaleDateString()}.`;
    } else if (isPastDue) {
      assignStatus = "Missed";
      assignColor = "red";
      desc = `Missed assignment due date for ${assign.course?.name || "Course"}. Was due on ${new Date(assign.dueDate).toLocaleDateString()}.`;
    }

    addMilestone(
      assign._id,
      assign.title || "Assignment",
      "Assignment",
      assignStatus,
      hasSubmitted ? (submission.submittedAt || assign.updatedAt) : assign.dueDate,
      desc,
      "/student/assignments",
      "Assignment",
      assignColor
    );
  }

  // 5. Exams
  const examSchedules = await ExamSchedule.find(
    student.course ? { course: { $regex: `^${student.course}$`, $options: "i" } } : {}
  ).lean();

  for (const exam of examSchedules) {
    const examDate = exam.examDate ? new Date(exam.examDate) : null;
    const isPast = examDate && examDate < new Date();
    const examStatus = isPast ? "Completed" : "Upcoming";
    const examColor = isPast ? "green" : "blue";

    addMilestone(
      exam._id,
      `Exam: ${exam.examName}`,
      "Exam",
      examStatus,
      examDate,
      `Exam scheduled for course ${exam.course}. Location: ${exam.location || "N/A"}. Time: ${exam.startTime || ""} - ${exam.endTime || ""}`,
      "/student/examschedule",
      "Exam",
      examColor
    );
  }

  // 6. Results
  const results = await Results.find({ studentId, status: "published" }).populate("courseId").lean();
  for (const res of results) {
    addMilestone(
      res._id,
      `Result Published: ${res.courseId?.name || "Course"}`,
      "Result",
      "Completed",
      res.updatedAt || res.createdAt,
      `Scored Grade ${res.grade || "N/A"} in ${res.courseId?.name || "Course"}${res.courseId?.code ? ` (${res.courseId.code})` : ""}.`,
      "/student/results",
      "Result",
      "green"
    );
  }

  // 7. Fees
  const fees = await Fee.find({ student: studentId }).lean();
  for (const fee of fees) {
    if (fee.scheduledInstallments && fee.scheduledInstallments.length > 0) {
      for (const inst of fee.scheduledInstallments) {
        let feeStatus = "Upcoming";
        let feeColor = "blue";

        if (inst.status === "paid") {
          feeStatus = "Completed";
          feeColor = "green";
        } else if (inst.status === "overdue" || (inst.status !== "paid" && new Date(inst.dueDate) < new Date())) {
          feeStatus = "Missed";
          feeColor = "red";
        }

        addMilestone(
          `${fee._id}_fee_${inst.sequence}`,
          `Fee Installment #${inst.sequence}`,
          "Fees",
          feeStatus,
          inst.paidOn || inst.dueDate,
          `Amount: ₹${inst.amount}. Due Date: ${new Date(inst.dueDate).toLocaleDateString()}. Status: ${inst.status.toUpperCase()}`,
          "/student/fees",
          "Fee",
          feeColor
        );
      }
    } else {
      let feeStatus = "Upcoming";
      let feeColor = "blue";
      if (fee.status === "Paid") {
        feeStatus = "Completed";
        feeColor = "green";
      } else if (fee.status === "Overdue" || new Date(fee.dueDate) < new Date()) {
        feeStatus = "Missed";
        feeColor = "red";
      }
      addMilestone(
        fee._id,
        "Fee Payment",
        "Fees",
        feeStatus,
        fee.dueDate,
        `Total Fee Amount: ₹${fee.total}. Paid: ₹${fee.paid}.`,
        "/student/fees",
        "Fee",
        feeColor
      );
    }
  }

  // 8. Leave Requests
  const leaves = await Leave.find({ user: studentId, role: "student" }).lean();
  for (const leave of leaves) {
    let leaveStatus = "Upcoming";
    let leaveColor = "blue";
    if (leave.status === "Approved") {
      leaveStatus = "Completed";
      leaveColor = "green";
    } else if (leave.status === "Rejected") {
      leaveStatus = "Missed";
      leaveColor = "red";
    }

    addMilestone(
      leave._id,
      `Leave Request: ${leave.subject}`,
      "Leave",
      leaveStatus,
      leave.startDate,
      `Requested leave from ${new Date(leave.startDate).toLocaleDateString()} to ${new Date(leave.endDate).toLocaleDateString()}. Reason: ${leave.reason}. Status: ${leave.status}`,
      "/student/leaves",
      "Leave",
      leaveColor
    );
  }

  // 9. Certificates
  const certificates = await VerifiedCertificate.find({ student: studentId }).lean();
  for (const cert of certificates) {
    const isRevoked = cert.revoked === true;
    addMilestone(
      cert._id,
      `Certificate Issued: ${cert.type.toUpperCase()}`,
      "Certificate",
      isRevoked ? "Missed" : "Completed",
      cert.issuedAt,
      `Cryptographically signed ${cert.type} issued. Certificate ID: ${cert.certId}.`,
      "/student/certificates",
      "Certificate",
      isRevoked ? "red" : "green"
    );
  }

  // 10. Achievements
  const achievements = await Achievement.find({ teacher: studentId }).lean();
  for (const ach of achievements) {
    let achStatus = "Upcoming";
    let achColor = "blue";
    if (ach.status === "approved") {
      achStatus = "Completed";
      achColor = "green";
    } else if (ach.status === "rejected") {
      achStatus = "Missed";
      achColor = "red";
    }

    addMilestone(
      ach._id,
      `Achievement: ${ach.title}`,
      "Achievement",
      achStatus,
      ach.achievementDate,
      `${ach.description}. Status: ${ach.status.toUpperCase()}`,
      "/student/achievements",
      "Achievement",
      achColor
    );
  }

  // 11. Graduation
  const hasDegree = certificates.some(c => c.type === "degree" && !c.revoked);
  const isAlumni = student.role === "alumni";

  if (hasDegree || isAlumni) {
    const gradCert = certificates.find(c => c.type === "degree");
    addMilestone(
      `${studentId}_grad`,
      "Graduation",
      "Graduation",
      "Completed",
      gradCert ? gradCert.issuedAt : new Date(),
      `Graduated successfully! Program: ${student.course || "N/A"}.`,
      "/student/profile",
      "Graduation",
      "green"
    );
  }

  // Filtering
  let filtered = milestones;
  if (category) {
    filtered = filtered.filter(m => m.category.toLowerCase() === category.toLowerCase());
  }
  if (status) {
    filtered = filtered.filter(m => m.status.toLowerCase() === status.toLowerCase());
  }

  // Sorting
  filtered.sort((a, b) => {
    const dateA = new Date(a.date).getTime();
    const dateB = new Date(b.date).getTime();
    return sort === "asc" ? dateA - dateB : dateB - dateA;
  });

  // Pagination
  const totalRecords = filtered.length;
  const pageNumber = Math.max(1, parseInt(page) || 1);
  const limitNumber = Math.max(1, parseInt(limit) || 20);
  const totalPages = Math.ceil(totalRecords / limitNumber);
  const startIndex = (pageNumber - 1) * limitNumber;
  const paginatedMilestones = filtered.slice(startIndex, startIndex + limitNumber);

  return {
    milestones: paginatedMilestones,
    pagination: {
      page: pageNumber,
      totalPages,
      totalRecords,
    },
  };
};
