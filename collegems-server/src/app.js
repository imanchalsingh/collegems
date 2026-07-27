// FILE: collegems-server/src/app.js

import express from "express";
import cors from "cors";
import path from "path";
import mongoose from "mongoose";
import analyticsRoutes from './routes/analyticsRoutes.js';
import httpContext from "express-http-context";
import { v4 as uuidv4 } from "uuid";

// Add this line near your other imports at the top of app.js
import resourceRoutes from "./routes/resource.routes.js";
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
import bookingRoutes from "./routes/booking.routes.js";
import courseRoutes from "./routes/course.routes.js";
import salaryRoutes from "./routes/salary.route.js";
import academicCalendarRoutes from "./routes/academicCalendar.routes.js";
import reportRoutes from "./routes/report.routes.js";
import feedbackRoutes from "./routes/feedback.routes.js"; // ← NEW
import examFormRoutes from "./routes/examForm.routes.js";
import leaveRoutes from "./routes/leave.routes.js";
import visitorRoutes from "./routes/visitors.routes.js";
import transferRoutes from "./routes/transfer.routes.js";
import scholarshipRoutes from "./routes/scholarship.routes.js";
import { authenticate } from "./middlewares/auth.middleware.js";
import syllabusRoutes from "./routes/syllabus.route.js";
import idCardRoutes from "./routes/idcard.routes.js";
import { verifyStudent } from "./controllers/idcard.controller.js";
import busRouteRoutes from "./routes/busRoute.routes.js";
import officeHoursRoutes from "./routes/officeHours.routes.js";
import examHallRoutes from "./routes/examHall.routes.js";
import hallAllocationRoutes from "./routes/hallAllocation.routes.js";
import Tenant from "./models/Tenant.model.js";
import reminderRoutes from "./routes/reminder.routes.js";
import { startReminderCron } from "./cron/reminder.cron.js";
// Apply Global Multi-Tenant Plugin
import tenantPlugin from "./utils/tenantPlugin.js";
mongoose.plugin(tenantPlugin);

// Import Centralized Router
import apiRouter from "./routes/index.js";

// Middlewares & Utilities
import { errorHandler } from "./middlewares/errorHandler.middleware.js";
import tenantResolver from "./middlewares/tenantResolver.js";
import log from "./utils/logger.js";
import cookieParser from "cookie-parser";
import { allowedOrigins } from "./config/cors.js";
const app = express();
app.set("query parser", "extended");

app.use(cookieParser());

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
  // Just add "x-tenant-id" to the end of this list!
  allowedHeaders: ["Content-Type", "Authorization", "X-Correlation-ID", "x-tenant-id"]
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



// Health check
app.get("/", (_req, res) => res.send("SCMS Backend Running 🚀"));

// ========================================
// MOUNT ALL ROUTES UNDER /api
// ========================================
// Fixed ReferenceError: changed 'router.use' to 'app.use'
app.use('/analytics', analyticsRoutes);
app.use("/api/reminders", reminderRoutes); // <-- Paste it right here!
app.use("/api", apiRouter);

// ========================================
// HEALTH CHECK
// ========================================
app.get("/", (_req, res) => {
  log.request("GET", "/", "health-check");
  res.send("SCMS Backend Running 🚀");
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

// ========================================
// AUTO-SEED DEFAULT TENANT
// ========================================
mongoose.connection.once('open', async () => {
  try {
    const tenantCount = await Tenant.countDocuments();
    if (tenantCount === 0) {
      console.log("⚠️ No tenants found in database. Creating a default one...");
      const newTenant = await Tenant.create({
        name: "Local Development College",
        slug: "collegems",           
        domain: "collegems",
        adminEmail: "admin@collegems.local", 
        status: "active"
      });
      console.log(`Default Tenant successfully created! ID: ${newTenant._id}`);
    }
  } catch (err) {
    console.log("Error creating default tenant:", err.message);
  }
});

startReminderCron();
export default app;