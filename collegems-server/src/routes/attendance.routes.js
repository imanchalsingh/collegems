import express from "express";
import { protect } from "../middlewares/auth.middleware.js";
import { allowRoles } from "../middlewares/role.middleware.js";
import {
  markAttendance,
  getMyAttendance,
  getLowAttendance,
  getAttendanceAlerts,
  resolveAttendanceAlert
} from "../controllers/attendance.controller.js";
import {
  startQrSession,
  getSessionQrPayload,
  endQrSession,
  getMyQrSessions,
  scanQrAttendance,
  syncOfflineQrScans,
} from "../controllers/qrAttendance.controller.js";
import { checkDataLock } from "../middlewares/dataLock.middleware.js";

const router = express.Router();

// ——— Offline-first QR TOTP attendance (#710) ———
router.post(
  "/sessions",
  protect,
  allowRoles("teacher"),
  checkDataLock("attendance"),
  startQrSession
);
router.get("/sessions/mine", protect, allowRoles("teacher"), getMyQrSessions);
router.get(
  "/sessions/:id/qr",
  protect,
  allowRoles("teacher"),
  getSessionQrPayload
);
router.post(
  "/sessions/:id/end",
  protect,
  allowRoles("teacher"),
  checkDataLock("attendance"),
  endQrSession
);
router.post(
  "/sessions/scan",
  protect,
  allowRoles("student"),
  checkDataLock("attendance"),
  scanQrAttendance
);
router.post(
  "/sessions/sync",
  protect,
  allowRoles("student"),
  checkDataLock("attendance"),
  syncOfflineQrScans
);

router.post(
  "/mark",
  protect,
  allowRoles("teacher"),
  checkDataLock("attendance"),
  markAttendance
);

router.get(
  "/my",
  protect,
  allowRoles("student", "parent"),
  getMyAttendance
);

router.get(
  "/low",
  protect,
  allowRoles("teacher", "hod", "student"),
  getLowAttendance
);

router.get(
  "/alerts",
  protect,
  allowRoles("teacher", "hod", "admin"),
  getAttendanceAlerts
);

router.patch(
  "/alerts/:id/resolve",
  protect,
  allowRoles("teacher", "hod", "admin"),
  checkDataLock("attendance"),
  resolveAttendanceAlert
);

export default router;
