// FILE: collegems-server/src/routes/index.js

import express from "express";

// ========================================
// IMPORT ALL ROUTES
// ========================================

// Auth & Core
import authRoutes from "./auth.routes.js";
import dashboardRoutes from "./dashboard.routes.js";
import userRoutes from "./user.routes.js";
import historyRoutes from "./history.routes.js";

// Academic Routes
import attendanceRoutes from "./attendance.routes.js";
import assignmentRoutes from "./assignment.routes.js";
import resultsRoutes from "./results.routes.js";
import assessmentRoutes from "./assessment.routes.js";
import courseRoutes from "./course.routes.js";
import classRoutes from "./class.route.js";
import syllabusRoutes from "./syllabus.route.js";
import timetableRoutes from "./timetable.routes.js";
import academicCalendarRoutes from "./academicCalendar.routes.js";

// Examination Routes
import examScheduleRoutes from "./examschedule.routes.js";
import examFormRoutes from "./examForm.routes.js";
import examHallRoutes from "./examHall.routes.js";
import hallAllocationRoutes from "./hallAllocation.routes.js";

// Financial Routes
import feeRoutes from "./fee.routes.js";
import salaryRoutes from "./salary.route.js";
import scholarshipRoutes from "./scholarship.routes.js";

// User & Admin Routes
import leaveRoutes from "./leave.routes.js";
import teacherAttendanceRoutes from "./teacher.attendance.route.js";
import officeHoursRoutes from "./officeHours.routes.js";

// Student Services
import idCardRoutes from "./idcard.routes.js";

// Community & Engagement
import eventRoute from "./event.routes.js";
import clubRoutes from "./clubs.routes.js";
import discussionRoutes from "./discussion.routes.js";
import studyGroupRoutes from "./studyGroup.routes.js";
import mentorshipRoutes from "./mentorship.routes.js";
import complaintRoutes from "./complaint.routes.js";
import feedbackRoutes from "./feedback.routes.js";

// Career & Placement
import jobBoardRoutes from "./jobBoard.routes.js";
import placementRoutes from "./placement.routes.js";
import alumniRoutes from "./alumni.routes.js";

// Resources & Facilities
import libraryRoutes from "./library.routes.js";
import resourceRoutes from "./resource.routes.js";
import bookingRoutes from "./booking.routes.js";
import busRouteRoutes from "./busRoute.routes.js";

// Reports & Analytics
import reportRoutes from "./report.routes.js";
import analyticsRoutes from "./analytics.routes.js";
import auditLogRoutes from "./auditLog.routes.js";
import systemHealthRoutes from "./systemHealth.routes.js";
import restoreRoutes from "./restore.routes.js";
import trackingRoutes from "./tracking.routes.js";


// Miscellaneous
import achievementRoutes from "./achievement.routes.js";
import announcementRoutes from "./announcement.routes.js";
import notificationRoutes from "./notification.routes.js";
import plagiarismRoutes from "./plagiarism.routes.js";
import workflowRoutes from "./workflow.routes.js";
import dependencyRoutes from "./dependency.routes.js";
import dataLockRoutes from "./dataLock.routes.js";
import snapshotRoutes from "./snapshot.routes.js";
import sequenceRoutes from "./sequence.routes.js";
import ownershipRoutes from "./ownership.routes.js";
import savedFilterRoutes from "./savedFilter.routes.js";
import abandonmentRoutes from "./abandonment.routes.js";
import temporaryLinkRoutes from "./temporaryLink.routes.js";

// Faculty Assignment (if needed later)
import facultyAssignmentRoutes from "./facultyAssignment.routes.js";

// import facultyAssignmentRoutes from "./facultyAssignment.routes.js";
import searchRoutes from './search.routes.js';

// ========================================
// MIDDLEWARES
// ========================================
import { authenticate } from "../middlewares/auth.middleware.js";
import { verifyStudent } from "../controllers/idcard.controller.js";

// ========================================
// CREATE CENTRALIZED ROUTER
// ========================================
const router = express.Router();

// ========================================
// CORE ROUTES (Commented out for now)
// ========================================
router.use("/auth", authRoutes);
router.use("/search", searchRoutes);
router.use("/dashboard", dashboardRoutes);
router.use("/faculty-assignments", facultyAssignmentRoutes);
// router.use("/auth", authRoutes);
router.use("/search", searchRoutes);
// router.use("/dashboard", dashboardRoutes);
// router.use("/faculty-assignments", facultyAssignmentRoutes);

// ========================================
// ACADEMIC ROUTES
// ========================================
router.use("/attendance", authenticate, attendanceRoutes);
router.use("/assignment", authenticate, assignmentRoutes);
router.use("/results", authenticate, resultsRoutes);
router.use("/assessments", authenticate, assessmentRoutes);
router.use("/courses", courseRoutes);
router.use("/classes", classRoutes);
router.use("/syllabus", authenticate, syllabusRoutes);
router.use("/timetable", authenticate, timetableRoutes);
router.use("/academic-calendar", academicCalendarRoutes);

// ========================================
// EXAMINATION ROUTES
// ========================================
router.use("/examschedule", authenticate, examScheduleRoutes);
router.use("/exam-forms", examFormRoutes);
router.use("/exam-halls", authenticate, examHallRoutes);
router.use("/hall-allocations", authenticate, hallAllocationRoutes);

// ========================================
// FINANCIAL ROUTES
// ========================================
router.use("/fee", authenticate, feeRoutes);
router.use("/salary", authenticate, salaryRoutes);
router.use("/scholarships", authenticate, scholarshipRoutes);

// ========================================
// USER & ADMIN ROUTES
// ========================================
router.use("/users", authenticate, userRoutes);
router.use("/history", historyRoutes);
router.use("/leaves", authenticate, leaveRoutes);
router.use("/teacher-attendance", teacherAttendanceRoutes);
router.use("/office-hours", officeHoursRoutes);

// ========================================
// STUDENT SERVICES
// ========================================
router.use("/student/idcard", idCardRoutes);
router.get("/verify/student/:studentId", authenticate, verifyStudent);

// ========================================
// COMMUNITY & ENGAGEMENT
// ========================================
router.use("/events", eventRoute);
router.use("/clubs", authenticate, clubRoutes);
router.use("/discussions", discussionRoutes);
router.use("/study-groups", studyGroupRoutes);
router.use("/mentorships", authenticate, mentorshipRoutes);
router.use("/complaints", complaintRoutes);
router.use("/feedback", authenticate, feedbackRoutes);

// ========================================
// CAREER & PLACEMENT
// ========================================
router.use("/jobs", jobBoardRoutes);
router.use("/placements", authenticate, placementRoutes);
router.use("/alumni", alumniRoutes);

// ========================================
// RESOURCES & FACILITIES
// ========================================
router.use("/library", libraryRoutes);
router.use("/resources", authenticate, resourceRoutes);
router.use("/bookings", authenticate, bookingRoutes);
router.use("/bus-routes", authenticate, busRouteRoutes);

// ========================================
// REPORTS & ANALYTICS
// ========================================
router.use("/reports", reportRoutes);
router.use("/analytics", authenticate, analyticsRoutes);
router.use("/audit-logs", authenticate, auditLogRoutes);
router.use("/system-health", authenticate, systemHealthRoutes);
router.use("/restore", restoreRoutes);


// ========================================
// MISCELLANEOUS
// ========================================
router.use("/achievements", authenticate, achievementRoutes);
router.use("/announcements", announcementRoutes);
router.use("/notifications", authenticate, notificationRoutes);
router.use("/tracking", trackingRoutes);
router.use("/plagiarism", authenticate, plagiarismRoutes);
router.use("/workflows", workflowRoutes);
router.use("/dependencies", dependencyRoutes);
router.use("/data-locks", dataLockRoutes);
router.use("/snapshots", snapshotRoutes);
router.use("/sequences", sequenceRoutes);
router.use("/ownership", ownershipRoutes);
router.use("/saved-filters", savedFilterRoutes);
router.use("/abandonment", abandonmentRoutes);
router.use("/temporary-links", temporaryLinkRoutes);

// ========================================
// EXPORT ROUTER
// ========================================
export default router;