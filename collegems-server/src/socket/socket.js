import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import logger from "../utils/logger.js";
import { initializeStudyGroupSockets } from "./studyGroupSocket.js";
import { allowedOrigins } from "../config/cors.js";

// Store active users in memory
const activeUsers = new Map();

/**
 * Configures and initializes the Socket.IO server.
 * @param {http.Server} httpServer - The HTTP server instance.
 * @param {express.Application} app - The Express application instance.
 * @returns {SocketIO.Server} The configured Socket.IO instance.
 */
const configureSocketIO = (httpServer, app) => {
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

  // Attach io instance to the Express app for use in route handlers
  app.set("io", io);

  // Socket.IO Authentication Middleware
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

  // Helper function to broadcast stats
const broadcastLiveStats = () => {
    const stats = { students: 0, teachers: 0, activePages: {} };
    
    activeUsers.forEach((user) => {
      if (user.role === 'student') stats.students++;
      if (user.role === 'teacher') stats.teachers++;
      
      const page = user.currentPage;
      stats.activePages[page] = (stats.activePages[page] || 0) + 1;
    });

    // ADD THIS LINE TO DEBUG:
    console.log("Broadcasting Stats to HOD:", stats); 

    // Send update only to admin and hod rooms
    io.to('admin').to('hod').emit('live_traffic_update', stats);
  };

  // Socket.IO Connection & Disconnection Events
  io.on("connection", (socket) => {
    const userId = socket.user?.id || socket.user?._id;
    const userRole = socket.user?.role; // Extracting role from your JWT payload
if (userId) {
      // Join individual user room
      socket.join(`user_${userId}`);
      
      // Join role-based room 
      if (userRole) {
        socket.join(userRole); 
      }

      // Add user to our active tracking map
      activeUsers.set(socket.id, {
        userId: userId,
        role: userRole,
        currentPage: '/dashboard' // Default starting point
      });

      // --- ADD THESE TWO LOGS ---
      console.log(`\n--- NEW CONNECTION ---`);
      console.log(`User ID: ${userId}`);
      console.log(`Raw User Role from JWT: "${userRole}"`); // This is where the bug likely is!
      // --------------------------

     logger.info(`🔥🔥🔥 SUPER CUSTOM LOG: ${userId}`);
      broadcastLiveStats(); 
    }

    // Track when user clicks to a new page
    socket.on('page_change', (newRoute) => {
      if (activeUsers.has(socket.id)) {
        activeUsers.get(socket.id).currentPage = newRoute;
        broadcastLiveStats();
      }
    });

    socket.on("disconnect", () => {
      if (userId) {
        logger.info(`User disconnected from socket: ${userId}`);
        // Remove user and update admins immediately on logout/close
        activeUsers.delete(socket.id);
        broadcastLiveStats();
      }
    });
  });

  // Initialize any specific socket modules
  initializeStudyGroupSockets(io);

  return io;
};

export default configureSocketIO;