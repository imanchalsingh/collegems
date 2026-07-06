import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import path from "path";
import { createProxyMiddleware } from "http-proxy-middleware";
import { createServer } from "http";
import { Server } from "socket.io";
import { connectDB } from "./src/config/db.js";
import { connectRabbitMQ } from "./src/utils/rabbitmq.js";
import { startPlagiarismWorker } from "./src/workers/plagiarismWorker.js";

import authRoutes from "./src/routes/auth.routes.js";
import userRoutes from "./src/routes/user.routes.js";
import feeRoutes from "./src/routes/fee.routes.js";
import salaryRoutes from "./src/routes/salary.route.js";
import notificationRoutes from "./src/routes/notification.routes.js";
import announcementRoutes from "./src/routes/announcement.routes.js";
import studyGroupRoutes from "./src/routes/studyGroup.routes.js";
import { authenticate } from "./src/middlewares/auth.middleware.js";
import { errorHandler } from "./src/middlewares/errorHandler.middleware.js";

// Full monolith app for Academics (we use it as a fallback for routes not explicitly extracted)
import appAcademics from "./src/app.js";

const PORT = process.env.PORT || 5000;
const SERVICE_NAME = process.env.SERVICE_NAME || "gateway";

const startService = async () => {
  const app = express();
  
  // CORS & Body parsing
  app.use(cors({ origin: true, credentials: true }));
  
  if (SERVICE_NAME !== "gateway") {
    app.use(express.json());
    await connectDB();
    await connectRabbitMQ();
  }

  if (SERVICE_NAME === "auth") {
    console.log("🛡️ Starting Auth Service...");
    app.use("/api/auth", authRoutes);
    app.use("/api/users", authenticate, userRoutes);
    app.use(errorHandler);
  } 
  else if (SERVICE_NAME === "finance") {
    console.log("💰 Starting Finance Service...");
    app.use("/api/fee", authenticate, feeRoutes);
    app.use("/api/salary", authenticate, salaryRoutes);
    app.use(errorHandler);
  } 
  else if (SERVICE_NAME === "notification") {
    console.log("🔔 Starting Notification Service...");
    app.use("/api/notifications", authenticate, notificationRoutes);
    app.use("/api/announcements", announcementRoutes);
    app.use(errorHandler);
    
    // We will listen to RabbitMQ events here
    const { subscribeEvent } = await import("./src/utils/rabbitmq.js");
    subscribeEvent("academics", "notifications_queue", "result.published", (data) => {
      console.log("🔔 Notification Service received event: result.published for student", data.studentId);
      // Logic to send notification
    });
  } 
  else if (SERVICE_NAME === "academics") {
    console.log("📚 Starting Academics Service...");
    // For simplicity, Academics runs the main app but the gateway will route auth/finance away from it
    app.use("/", appAcademics);
    startPlagiarismWorker();
  } 
  else if (SERVICE_NAME === "gateway") {
    console.log("🚪 Starting API Gateway...");
    
    // Route to Auth Service
    app.use("/api/auth", createProxyMiddleware({ target: "http://localhost:5001", changeOrigin: true }));
    app.use("/api/users", createProxyMiddleware({ target: "http://localhost:5001", changeOrigin: true }));
    
    // Route to Finance Service
    app.use("/api/fee", createProxyMiddleware({ target: "http://localhost:5002", changeOrigin: true }));
    app.use("/api/salary", createProxyMiddleware({ target: "http://localhost:5002", changeOrigin: true }));
    
    // Route to Notification Service
    app.use("/api/notifications", createProxyMiddleware({ target: "http://localhost:5003", changeOrigin: true }));
    app.use("/api/announcements", createProxyMiddleware({ target: "http://localhost:5003", changeOrigin: true }));
    
    // Default fallback to Academics Service
    app.use("/", createProxyMiddleware({ target: "http://localhost:5004", changeOrigin: true, ws: true }));
  }

  const httpServer = createServer(app);
  
  if (SERVICE_NAME === "academics" || SERVICE_NAME === "gateway") {
    // Academics needs websockets for study groups and chat
    const io = new Server(httpServer, {
      cors: { origin: true, credentials: true }
    });
    app.set("io", io);
    if (SERVICE_NAME === "academics") {
      const { initializeStudyGroupSockets } = await import("./src/socket/studyGroupSocket.js");
      initializeStudyGroupSockets(io);
    }
  }

  httpServer.listen(PORT, () => {
    console.log(`🚀 ${SERVICE_NAME.toUpperCase()} running on port ${PORT}`);
  });
};

startService();
