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
import searchRoutes from "./search.routes.js";
import facultyAssignmentRoutes from "./facultyAssignment.routes.js";

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
import seatingPlanRoutes from "./seatingPlan.routes.js";

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
import transferRoutes from "./transfer.routes.js";

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
import resumeRoutes from "./resume.routes.js";

// Resources & Facilities
import libraryRoutes from "./library.routes.js";
import resourceRoutes from "./resource.routes.js";
import bookingRoutes from "./booking.routes.js";
import busRouteRoutes from "./busRoute.routes.js";

// Reports & Analytics
import reportRoutes from "./report.routes.js";
import analyticsRoutes from "./analytics.routes.js";
import quizRoutes from "./quiz.routes.js";
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
// PUBLIC & EXCEPTION ROUTES
// ========================================
router.use("/auth", authRoutes);
router.use("/assignment", assignmentRoutes);
router.use("/temporary-links", temporaryLinkRoutes);

// ========================================
// AUTHENTICATED ROUTES
// ========================================
const authenticatedRouter = express.Router();
authenticatedRouter.use(authenticate);

// Core Routes
authenticatedRouter.use("/search", searchRoutes);
authenticatedRouter.use("/dashboard", dashboardRoutes);
authenticatedRouter.use("/faculty-assignments", facultyAssignmentRoutes);

// Academic Routes
authenticatedRouter.use("/attendance", attendanceRoutes);
authenticatedRouter.use("/results", resultsRoutes);
authenticatedRouter.use("/assessments", assessmentRoutes);
authenticatedRouter.use("/courses", courseRoutes);
authenticatedRouter.use("/classes", classRoutes);
authenticatedRouter.use("/syllabus", syllabusRoutes);
authenticatedRouter.use("/timetable", timetableRoutes);
authenticatedRouter.use("/academic-calendar", academicCalendarRoutes);

// Examination Routes
authenticatedRouter.use("/examschedule", examScheduleRoutes);
authenticatedRouter.use("/exam-forms", examFormRoutes);
authenticatedRouter.use("/exam-halls", examHallRoutes);
authenticatedRouter.use("/hall-allocations", hallAllocationRoutes);
authenticatedRouter.use("/seating-plans", seatingPlanRoutes);

// Financial Routes
authenticatedRouter.use("/fee", feeRoutes);
authenticatedRouter.use("/salary", salaryRoutes);
authenticatedRouter.use("/scholarships", scholarshipRoutes);

// User & Admin Routes
authenticatedRouter.use("/users", userRoutes);
authenticatedRouter.use("/history", historyRoutes);
authenticatedRouter.use("/leaves", leaveRoutes);
authenticatedRouter.use("/teacher-attendance", teacherAttendanceRoutes);
authenticatedRouter.use("/office-hours", officeHoursRoutes);

// Student Services
authenticatedRouter.use("/student/idcard", idCardRoutes);
authenticatedRouter.get("/verify/student/:studentId", verifyStudent);
authenticatedRouter.use("/transfer", transferRoutes);

// Community & Engagement
authenticatedRouter.use("/events", eventRoute);
authenticatedRouter.use("/clubs", clubRoutes);
authenticatedRouter.use("/discussions", discussionRoutes);
authenticatedRouter.use("/study-groups", studyGroupRoutes);
authenticatedRouter.use("/mentorships", mentorshipRoutes);
authenticatedRouter.use("/complaints", complaintRoutes);
authenticatedRouter.use("/feedback", feedbackRoutes);

// Career & Placement
authenticatedRouter.use("/jobs", jobBoardRoutes);
authenticatedRouter.use("/placements", placementRoutes);
authenticatedRouter.use("/alumni", alumniRoutes);
authenticatedRouter.use("/resume", resumeRoutes);

// Resources & Facilities
authenticatedRouter.use("/library", libraryRoutes);
authenticatedRouter.use("/resources", resourceRoutes);
authenticatedRouter.use("/bookings", bookingRoutes);
authenticatedRouter.use("/bus-routes", busRouteRoutes);

// Reports & Analytics
authenticatedRouter.use("/reports", reportRoutes);
authenticatedRouter.use("/analytics", analyticsRoutes);
authenticatedRouter.use("/quizzes", quizRoutes);
authenticatedRouter.use("/audit-logs", auditLogRoutes);
authenticatedRouter.use("/system-health", systemHealthRoutes);
authenticatedRouter.use("/restore", restoreRoutes);

// Miscellaneous
authenticatedRouter.use("/achievements", achievementRoutes);
authenticatedRouter.use("/announcements", announcementRoutes);
authenticatedRouter.use("/notifications", notificationRoutes);
authenticatedRouter.use("/tracking", trackingRoutes);
authenticatedRouter.use("/plagiarism", plagiarismRoutes);
authenticatedRouter.use("/workflows", workflowRoutes);
authenticatedRouter.use("/dependencies", dependencyRoutes);
authenticatedRouter.use("/data-locks", dataLockRoutes);
authenticatedRouter.use("/snapshots", snapshotRoutes);
authenticatedRouter.use("/sequences", sequenceRoutes);
authenticatedRouter.use("/ownership", ownershipRoutes);
authenticatedRouter.use("/saved-filters", savedFilterRoutes);
authenticatedRouter.use("/abandonment", abandonmentRoutes);

// Register Authenticated Sub-Router
router.use(authenticatedRouter);

// ========================================
// EXPORT ROUTER
// ========================================
export default router;