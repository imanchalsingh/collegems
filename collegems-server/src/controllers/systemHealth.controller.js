import mongoose from "mongoose";
import User from "../models/User.model.js";
import Leave from "../models/Leave.model.js";
import Scholarship from "../models/Scholarship.model.js";
import Booking from "../models/Booking.model.js";
import Complaint from "../models/Complaint.model.js";
import ExaminationForm from "../models/ExaminationForm.model.js";
import os from "os";

export const getSystemHealth = async (req, res) => {
  try {
    // 1. Active Users metrics
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ accountStatus: "active" });
    
    const activeStudents = await User.countDocuments({ role: "student", accountStatus: "active" });
    const activeTeachers = await User.countDocuments({ role: "teacher", accountStatus: "active" });
    const activeHods = await User.countDocuments({ role: "hod", accountStatus: "active" });
    const activeParents = await User.countDocuments({ role: "parent", accountStatus: "active" });

    // 2. Pending Actions metrics
    const pendingLeaves = await Leave.countDocuments({ status: "Pending" });
    const pendingScholarships = await Scholarship.countDocuments({ status: "Pending" });
    const pendingBookings = await Booking.countDocuments({ status: "pending" });
    const pendingComplaints = await Complaint.countDocuments({ status: { $in: ["Submitted", "Under Review", "In Progress"] } });
    const pendingExamForms = await ExaminationForm.countDocuments({ status: "Pending" });

    const totalPendingActions = pendingLeaves + pendingScholarships + pendingBookings + pendingComplaints + pendingExamForms;

    // 3. Archived Records metrics
    const archivedRecords = await User.countDocuments({ accountStatus: "archived" });

    // 4. System status details
    const dbState = mongoose.connection.readyState;
    const dbStatus = dbState === 1 ? "Healthy" : "Unhealthy";

    const uptime = process.uptime();
    const memoryUsage = process.memoryUsage();

    res.status(200).json({
      success: true,
      metrics: {
        activeUsers: {
          total: activeUsers,
          breakdown: {
            students: activeStudents,
            teachers: activeTeachers,
            hods: activeHods,
            parents: activeParents
          }
        },
        pendingActions: {
          total: totalPendingActions,
          breakdown: {
            leaves: pendingLeaves,
            scholarships: pendingScholarships,
            bookings: pendingBookings,
            complaints: pendingComplaints,
            examForms: pendingExamForms
          }
        },
        archivedRecords: {
          total: archivedRecords
        }
      },
      system: {
        dbStatus,
        dbState,
        uptime,
        memory: {
          heapUsed: Math.round(memoryUsage.heapUsed / (1024 * 1024)), // in MB
          heapTotal: Math.round(memoryUsage.heapTotal / (1024 * 1024)), // in MB
          rss: Math.round(memoryUsage.rss / (1024 * 1024)) // in MB
        },
        platform: os.platform(),
        nodeVersion: process.version
      }
    });
  } catch (error) {
    console.error("Error fetching system health:", error);
    res.status(500).json({ success: false, message: "Error retrieving system health data." });
  }
};
