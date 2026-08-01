// collegems-server/src/bootstrap/index.js

import dotenv from "dotenv";
dotenv.config();

import app from "../app.js";
import { connectDB } from "../config/db.js";
import { startFeeCronJobs, startAnalyticsCronJobs, startLibraryCronJobs, startAttendanceCronJobs } from "../utils/cronJobs.js";

import { createServer } from "http";
import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { execSync } from "child_process";
import { initializeStudyGroupSockets } from "../socket/studyGroupSocket.js";
import { allowedOrigins } from "../config/cors.js";
import { registerProcessErrorHandlers } from "../utils/processErrorHandlers.js";
import helmet from "helmet";

// ✅ REGISTER ERROR HANDLERS - SABSE PEHLE
registerProcessErrorHandlers();

const PORT = process.env.PORT || 5000;

const freePort = () => {
  try {
    if (process.platform === "win32") {
      // Windows command
      const output = execSync(`netstat -ano | findstr :${PORT}`, { encoding: "utf8", timeout: 2000 });
      const lines = output.trim().split("\n");
      if (lines.length > 0) {
        const parts = lines[0].trim().split(/\s+/);
        const pid = parts[parts.length - 1];
        if (pid && pid !== "0") {
          execSync(`taskkill /PID ${pid} /F`, { timeout: 1000 });
          console.log(`Freed port ${PORT} (killed PID ${pid})`);
        }
      }
    } else {
      // macOS / Linux command
      const pid = execSync(`lsof -ti:${PORT}`, { encoding: "utf8", timeout: 2000 }).trim();
      if (pid) {
        execSync(`kill -9 ${pid}`, { timeout: 1000 });
        console.log(`Freed port ${PORT} (killed PID ${pid})`);
      }
    }
  } catch {
    // Port is free
  }
};

export const initializeApp = () => {
  if (!process.env.MONGO_URI) {
    console.error(
      "Missing MONGO_URI in .env. Please set MONGO_URI to your MongoDB connection string."
    );
    process.exit(1);
  }

  if (!process.env.JWT_SECRET || !process.env.JWT_REFRESH_SECRET) {
    console.error(
      "Missing JWT secrets in .env. Please set both JWT_SECRET and JWT_REFRESH_SECRET."
    );
    process.exit(1);
  }

  connectDB();

  startFeeCronJobs();
  startAnalyticsCronJobs();
  startLibraryCronJobs();
  startAttendanceCronJobs();

  const httpServer = createServer(app);

  const io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error("Not allowed by CORS"));
        }
      },
      methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
      credentials: true,
    },
  });

  app.set("io", io);

  io.use((socket, next) => {
    const token = socket.handshake.auth.token || socket.handshake.query.token;
    if (!token) {
      return next(new Error("Authentication error"));
    }
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = decoded;
      next();
    } catch (err) {
      next(new Error("Authentication error"));
    }
  });

  // --- LIVE TRAFFIC TRACKING LOGIC ---
  const activeUsers = new Map();
const broadcastLiveStats = (ioInstance) => {
    const stats = { students: 0, teachers: 0 };
    
    for (const [socketId, data] of activeUsers.entries()) {
      const role = data.role?.toLowerCase();
      if (role === 'student') stats.students++;
      if (role === 'teacher') stats.teachers++;
    }
    
    // 🔥 CHANGED: Temporarily emit to EVERYONE instead of just .to('hod')
    ioInstance.emit('live_traffic_update', stats);
  };
io.on("connection", (socket) => {
    console.log(`\n🚨🚨🚨 BOOTSTRAP SOCKET CONNECTED! 🚨🚨🚨`);
    console.log(`Socket ID: ${socket.id}`);
    console.log(`Raw User Object from Token:`, socket.user); // Let's see EXACTLY what the token holds!

    const userId = socket.user?.id || socket.user?._id;
    const userRole = socket.user?.role || socket.user?.userType || 'UNKNOWN_ROLE'; 

    // 1. Join Individual Room
    if (userId) socket.join(`user_${userId}`);
    
    // 2. Join Role Room
    socket.join(userRole.toLowerCase()); 

    // 3. Track User in Memory
    activeUsers.set(socket.id, {
      userId: userId,
      role: userRole
    });

    // 4. Broadcast the new count
    broadcastLiveStats(io);

    socket.on("disconnect", () => {
      console.log(`🚨 User Disconnected from Bootstrap: ${userId || socket.id}`);
      activeUsers.delete(socket.id);
      broadcastLiveStats(io);
    });
  });
  setInterval(() => {
      broadcastLiveStats(io);
  }, 3000);
  // -----------------------------------

  initializeStudyGroupSockets(io);

  // BullMQ / Redis background workers (#705)
  import("../config/redis.config.js")
    .then((redis) => redis.getRedisConnection())
    .then(() => import("../queues/queue.registry.js"))
    .then((q) => q.initQueues())
    .then(() => import("../workers/bullWorkers.js"))
    .then((w) => w.startBullWorkers(io))
    .catch((err) => {
      console.warn("Queue bootstrap warning:", err.message);
    });

  freePort();

  // ✅ RETURN BOTH THE EXPRESS APP AND HTTP SERVER TO server.js
  return { app, httpServer };
};