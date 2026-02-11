import express from "express";
import cors from "cors";

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

// Admin / HOD
import courseRoutes from "./routes/course.routes.js";

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/dashboard", dashboardRoutes);

app.use("/api/attendance", attendanceRoutes);
app.use("/api/assignment", assignmentRoutes);

app.use("/api/courses", courseRoutes);
app.use("/api/classes", classRoutes);

app.use("/api/fee", feeRoutes);

app.use("/api/users", userRoutes);
app.use("/api/examschedule", examScheduleRoutes);

// Health check (optional but useful)
app.get("/", (req, res) => {
  res.send("SCMS Backend Running 🚀");
});

export default app;
