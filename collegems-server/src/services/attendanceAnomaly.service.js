import mongoose from "mongoose";
import Attendance from "../models/Attendance.model.js";
import AttendanceAlert from "../models/AttendanceAlert.model.js";
import User from "../models/User.model.js";
import log from "../utils/logger.js";

const CONSECUTIVE_ABSENCE_THRESHOLD = parseInt(process.env.CONSECUTIVE_ABSENCE_THRESHOLD || "3", 10);
const MISSING_ATTENDANCE_DAYS_THRESHOLD = parseInt(process.env.MISSING_ATTENDANCE_DAYS_THRESHOLD || "5", 10);

export const analyzeAttendanceAnomalies = async () => {
  log.info("Starting automated attendance anomaly detection...");
  try {
    const alertsToUpsert = [];

    // 1. Detect Consecutive Absences
    const consecutiveAbsences = await Attendance.aggregate([
      { $sort: { date: -1 } },
      {
        $group: {
          _id: { student: "$student", course: "$course" },
          statuses: { $push: "$status" }
        }
      },
      {
        $project: {
          recentStatuses: { $slice: ["$statuses", CONSECUTIVE_ABSENCE_THRESHOLD] }
        }
      }
    ]);

    for (const record of consecutiveAbsences) {
      if (
        record.recentStatuses.length === CONSECUTIVE_ABSENCE_THRESHOLD &&
        record.recentStatuses.every(s => s === "absent")
      ) {
        alertsToUpsert.push({
          updateOne: {
            filter: {
              student: record._id.student,
              course: record._id.course,
              alertType: "CONSECUTIVE_ABSENCE",
              status: "active"
            },
            update: {
              $set: {
                severity: "high",
                description: `Absent for ${CONSECUTIVE_ABSENCE_THRESHOLD} consecutive classes`,
                lastDetectedAt: new Date()
              }
            },
            upsert: true
          }
        });
      }
    }

    // 2. Detect Missing Records (no attendance across any course recently)
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - MISSING_ATTENDANCE_DAYS_THRESHOLD);
    // Convert thresholdDate to YYYY-MM-DD
    const thresholdDateString = thresholdDate.toISOString().split("T")[0];

    // Find latest attendance date per student
    const latestAttendance = await Attendance.aggregate([
      {
        $group: {
          _id: "$student",
          lastAttendanceDate: { $max: "$date" }
        }
      }
    ]);

    const activeStudents = await User.find({ role: "student" }).select("_id").lean();
    const studentIds = new Set(activeStudents.map(s => s._id.toString()));

    for (const record of latestAttendance) {
      if (record.lastAttendanceDate < thresholdDateString) {
        alertsToUpsert.push({
          updateOne: {
            filter: {
              student: record._id,
              alertType: "MISSING_RECORDS",
              status: "active"
            },
            update: {
              $set: {
                severity: "medium",
                description: `No attendance records found since ${record.lastAttendanceDate}`,
                lastDetectedAt: new Date()
              }
            },
            upsert: true
          }
        });
      }
      studentIds.delete(record._id.toString());
    }

    // Any student who has NEVER had attendance marked
    for (const studentId of studentIds) {
      alertsToUpsert.push({
        updateOne: {
          filter: {
            student: studentId,
            alertType: "MISSING_RECORDS",
            status: "active"
          },
          update: {
            $set: {
              severity: "high",
              description: `No attendance records found for this student ever`,
              lastDetectedAt: new Date()
            }
          },
          upsert: true
        }
      });
    }

    if (alertsToUpsert.length > 0) {
      await AttendanceAlert.bulkWrite(alertsToUpsert);
      log.info(`Upserted ${alertsToUpsert.length} attendance alerts.`);
    } else {
      log.info("No attendance anomalies detected.");
    }
  } catch (error) {
    log.error("Failed to analyze attendance anomalies:", error);
  }
};
