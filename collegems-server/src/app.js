// FILE: collegems-server/src/app.js

import express from "express";
import cors from "cors";
import path from "path";
import mongoose from "mongoose";
import httpContext from "express-http-context";
import { v4 as uuidv4 } from "uuid";

// Auth & Core
import authRoutes from "./routes/auth.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";
import userRoutes from "./routes/user.routes.js";

// Student / Teacher
import attendanceRoutes from "./routes/attendance.routes.js";
import assignmentRoutes from "./routes/assignment.routes.js";
import feeRoutes from "./routes/fee.routes.js";
import examScheduleRoutes from "./routes/examschedule.routes.js";
import classRoutes from "./routes/class.route.js";
import teacherAttendanceRoutes from "./routes/teacher.attendance.route.js";
import eventRoute from "./routes/event.routes.js";
import resultsRoutes from "./routes/results.routes.js";
import libraryRoutes from "./routes/library.routes.js";
import assessmentRoutes from "./routes/assessment.routes.js";

import courseRoutes from "./routes/course.routes.js";
import salaryRoutes from "./routes/salary.route.js";
import academicCalendarRoutes from "./routes/academicCalendar.routes.js";
import reportRoutes from "./routes/report.routes.js";
import feedbackRoutes from "./routes/feedback.routes.js"; // ← NEW
import examFormRoutes from "./routes/examForm.routes.js";
import leaveRoutes from "./routes/leave.routes.js";
import scholarshipRoutes from "./routes/scholarship.routes.js";
import idCardRoutes from "./routes/idcard.routes.js";
import { verifyStudent } from "./controllers/idcard.controller.js";
import busRouteRoutes from "./routes/busRoute.routes.js";
import syllabusRoutes from "./routes/syllabus.route.js";
import officeHoursRoutes from "./routes/officeHours.routes.js";
import examHallRoutes from "./routes/examHall.routes.js";
import hallAllocationRoutes from "./routes/hallAllocation.routes.js";
import auditLogRoutes from "./routes/auditLog.routes.js";
import resourceRoutes from "./routes/resource.routes.js";
import bookingRoutes from "./routes/booking.routes.js";
import transferRoutes from "./routes/transfer.routes.js";
import { authenticate } from "./middlewares/auth.middleware.js";
// Apply Global Multi-Tenant Plugin
import tenantPlugin from "./utils/tenantPlugin.js";
mongoose.plugin(tenantPlugin);

// Import Centralized Router
import apiRouter from "./routes/index.js";

// Middlewares & Utilities
import { errorHandler } from "./middlewares/errorHandler.middleware.js";
import tenantResolver from "./middlewares/tenantResolver.js";
import log from "./utils/logger.js";
import { allowedOrigins } from "./config/cors.js";

const app = express();
app.set("query parser", "extended");

// Middlewares
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Correlation-ID"]
}));

app.use(express.json());

// Correlation ID Tracking & Request Logging
app.use(httpContext.middleware);
app.use((req, res, next) => {
  const correlationId = req.headers['x-correlation-id'] || uuidv4();
  httpContext.set('correlationId', correlationId);
  res.setHeader('X-Correlation-ID', correlationId);
  log.request(req.method, req.originalUrl, req.user?.id || "anonymous");
  next();
});

// Static Files
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// Routes
app.use("/api/auth",      authRoutes);
app.use("/api/dashboard", dashboardRoutes);

app.use("/api/attendance",        authenticate, attendanceRoutes);
app.use("/api/assignment",        authenticate, assignmentRoutes);
app.use("/api/teacher-attendance", teacherAttendanceRoutes);
app.use("/api/events",            eventRoute);
app.use("/api/results",           authenticate, resultsRoutes);
app.use("/api/library",           libraryRoutes);
app.use("/api/assessments", authenticate, assessmentRoutes);

app.use("/api/resources", authenticate, resourceRoutes);
app.use("/api/bookings", authenticate, bookingRoutes);

app.use("/api/courses",  courseRoutes);
app.use("/api/classes",  classRoutes);

app.use("/api/fee",    authenticate, feeRoutes);
app.use("/api/salary", authenticate, salaryRoutes);

app.use("/api/users", authenticate, userRoutes);
import mentorshipRoutes from "./routes/mentorship.routes.js";
import complaintRoutes from "./routes/complaint.routes.js";
app.use("/api/transfer", authenticate, transferRoutes);
app.use("/api/leaves", authenticate, leaveRoutes);
app.use("/api/scholarships", authenticate, scholarshipRoutes);
app.use("/api/examschedule", authenticate, examScheduleRoutes);
app.use("/api/exam-forms", examFormRoutes);
app.use("/api/academic-calendar", academicCalendarRoutes);
app.use("/api/syllabus", authenticate, syllabusRoutes);
app.use("/api/reports",         reportRoutes);
app.use("/api/feedback",        authenticate, feedbackRoutes);
app.use("/api/student/idcard", idCardRoutes);
app.get("/api/verify/student/:studentId", verifyStudent);
app.use("/api/bus-routes", authenticate, busRouteRoutes);
app.use("/api/office-hours", officeHoursRoutes);
app.use("/api/exam-halls", authenticate, examHallRoutes);
app.use("/api/hall-allocations", authenticate, hallAllocationRoutes);
app.use("/api/mentorships", mentorshipRoutes);
app.use("/api/complaints", complaintRoutes);

// Health check
app.get("/", (_req, res) => res.send("SCMS Backend Running 🚀"));

// ========================================
// MOUNT ALL ROUTES UNDER /api
// ========================================
app.use("/api", apiRouter);

// ========================================
// HEALTH CHECK
// ========================================
app.get("/", (_req, res) => {
  log.request("GET", "/", "health-check");
  res.send("SCMS Backend Running");
});

// ========================================
// ERROR HANDLING
// ========================================

// 404 handler
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
    errorCode: "ROUTE_NOT_FOUND",
  });
});

// Global error handler (must be last)
app.use(errorHandler);

export default app;
