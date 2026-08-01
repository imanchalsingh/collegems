import Attendance from "../models/Attendance.model.js";
import AttendanceSession from "../models/AttendanceSession.model.js";
import Course from "../models/Course.model.js";
import User from "../models/User.model.js";
import { AppError, asyncHandler } from "../middlewares/errorHandler.middleware.js";
import { logAction } from "../utils/auditService.js";
import { checkSemesterFrozen } from "../services/semesterService.js";
import log from "../utils/logger.js";
import {
  TOTP_PERIOD_SECONDS,
  generateTotpSecret,
  generateTotp,
  verifyTotp,
  isWithinGeofence,
} from "../utils/totp.util.js";

const roomName = (sessionId) => `attendance_session_${sessionId}`;

function todayYmd() {
  return new Date().toISOString().slice(0, 10);
}

function emitMarked(req, session, payload) {
  const io = req.app.get("io");
  if (io) {
    io.to(roomName(session._id.toString())).emit("attendance:marked", payload);
  }
}

/**
 * Teacher starts a live QR attendance session.
 * POST /api/attendance/sessions
 */
export const startQrSession = asyncHandler(async (req, res) => {
  const {
    courseId,
    date = todayYmd(),
    lat,
    lng,
    radiusMeters = 100,
    durationMinutes = 60,
  } = req.body;

  if (!courseId) {
    throw new AppError("courseId is required", 400, "MISSING_COURSE");
  }
  if (typeof lat !== "number" || typeof lng !== "number") {
    throw new AppError(
      "Classroom coordinates (lat, lng) are required for geofencing",
      400,
      "MISSING_GEO"
    );
  }

  const course = await Course.findById(courseId);
  if (!course) {
    throw new AppError("Course not found", 404, "NOT_FOUND");
  }
  if (course.teacher.toString() !== req.user.id) {
    throw new AppError("Not authorized for this course", 403, "FORBIDDEN");
  }

  // End any other active sessions for this teacher+course
  await AttendanceSession.updateMany(
    { teacher: req.user.id, course: courseId, status: "active" },
    { $set: { status: "ended", endedAt: new Date() } }
  );

  const totpSecret = generateTotpSecret();
  const endsAt = new Date(Date.now() + Math.max(5, durationMinutes) * 60 * 1000);

  const session = await AttendanceSession.create({
    course: courseId,
    teacher: req.user.id,
    date,
    totpSecret,
    totpPeriodSeconds: TOTP_PERIOD_SECONDS,
    geo: {
      lat,
      lng,
      radiusMeters: Math.min(2000, Math.max(10, Number(radiusMeters) || 100)),
    },
    endsAt,
  });

  await logAction(req.user.id, "START_QR_ATTENDANCE", "AttendanceSession", session._id, {
    courseId,
    date,
  });

  log.info("QR attendance session started", { sessionId: session._id, courseId });

  res.status(201).json({
    success: true,
    data: {
      sessionId: session._id,
      courseId,
      courseName: course.name,
      date,
      totpSecret,
      totpPeriodSeconds: TOTP_PERIOD_SECONDS,
      room: roomName(session._id.toString()),
      geo: session.geo,
      endsAt: session.endsAt,
      startedAt: session.startedAt,
    },
  });
});

/**
 * Current OTP + QR payload for teacher projection (also useful after refresh).
 * GET /api/attendance/sessions/:id/qr
 */
export const getSessionQrPayload = asyncHandler(async (req, res) => {
  const session = await AttendanceSession.findById(req.params.id).select("+totpSecret");
  if (!session) {
    throw new AppError("Session not found", 404, "NOT_FOUND");
  }
  if (session.teacher.toString() !== req.user.id) {
    throw new AppError("Not authorized", 403, "FORBIDDEN");
  }
  if (session.status !== "active") {
    throw new AppError("Session has ended", 409, "SESSION_ENDED");
  }
  if (session.endsAt && session.endsAt < new Date()) {
    session.status = "ended";
    session.endedAt = new Date();
    await session.save();
    throw new AppError("Session expired", 409, "SESSION_EXPIRED");
  }

  const now = Date.now();
  const otp = generateTotp(session.totpSecret, now, session.totpPeriodSeconds);
  const payload = {
    v: 1,
    sid: session._id.toString(),
    otp,
    ts: Math.floor(now / 1000),
  };

  res.json({
    success: true,
    data: {
      payload,
      qrValue: JSON.stringify(payload),
      totpPeriodSeconds: session.totpPeriodSeconds,
      expiresInMs:
        session.totpPeriodSeconds * 1000 -
        (now % (session.totpPeriodSeconds * 1000)),
    },
  });
});

/**
 * Teacher ends session.
 * POST /api/attendance/sessions/:id/end
 */
export const endQrSession = asyncHandler(async (req, res) => {
  const session = await AttendanceSession.findById(req.params.id);
  if (!session) {
    throw new AppError("Session not found", 404, "NOT_FOUND");
  }
  if (session.teacher.toString() !== req.user.id) {
    throw new AppError("Not authorized", 403, "FORBIDDEN");
  }

  session.status = "ended";
  session.endedAt = new Date();
  await session.save();

  const io = req.app.get("io");
  if (io) {
    io.to(roomName(session._id.toString())).emit("attendance:session_ended", {
      sessionId: session._id,
    });
  }

  await logAction(req.user.id, "END_QR_ATTENDANCE", "AttendanceSession", session._id, {});

  res.json({ success: true, data: session });
});

/**
 * Teacher lists own active/recent sessions.
 * GET /api/attendance/sessions/mine
 */
export const getMyQrSessions = asyncHandler(async (req, res) => {
  const sessions = await AttendanceSession.find({ teacher: req.user.id })
    .sort({ createdAt: -1 })
    .limit(20)
    .populate("course", "name code")
    .lean();

  res.json({ success: true, data: sessions });
});

/**
 * Shared verification + upsert for live scan and offline sync.
 */
async function processScan({
  req,
  studentId,
  sessionId,
  totpCode,
  scannedAt,
  geo,
  deviceFingerprint,
  method = "qr_totp",
  clientScanId,
}) {
  if (!sessionId || !totpCode) {
    return {
      clientScanId,
      status: "rejected",
      reason: "sessionId and totpCode are required",
    };
  }
  if (!deviceFingerprint || typeof deviceFingerprint !== "string") {
    return {
      clientScanId,
      status: "rejected",
      reason: "deviceFingerprint is required",
    };
  }
  if (
    !geo ||
    typeof geo.lat !== "number" ||
    typeof geo.lng !== "number"
  ) {
    return {
      clientScanId,
      status: "rejected",
      reason: "geo.lat and geo.lng are required",
    };
  }

  const session = await AttendanceSession.findById(sessionId).select("+totpSecret");
  if (!session) {
    return { clientScanId, status: "rejected", reason: "Session not found" };
  }
  if (session.status !== "active") {
    return { clientScanId, status: "rejected", reason: "Session has ended" };
  }
  if (session.endsAt && session.endsAt < new Date()) {
    session.status = "ended";
    session.endedAt = new Date();
    await session.save();
    return { clientScanId, status: "rejected", reason: "Session expired" };
  }

  const scanTime = scannedAt ? new Date(scannedAt) : new Date();
  if (Number.isNaN(scanTime.getTime())) {
    return { clientScanId, status: "rejected", reason: "Invalid scannedAt" };
  }

  // For offline sync, verify OTP at the time the student scanned (not now).
  const verifyAt = method === "qr_offline_sync" ? scanTime.getTime() : Date.now();
  const otpOk = verifyTotp(session.totpSecret, String(totpCode), {
    nowMs: verifyAt,
    periodSeconds: session.totpPeriodSeconds,
  });
  if (!otpOk) {
    return {
      clientScanId,
      status: "rejected",
      reason: "Invalid or expired TOTP code",
    };
  }

  if (
    !isWithinGeofence(
      geo.lat,
      geo.lng,
      session.geo.lat,
      session.geo.lng,
      session.geo.radiusMeters
    )
  ) {
    return {
      clientScanId,
      status: "rejected",
      reason: "Outside classroom geofence",
    };
  }

  // Anti-proxy: bind first device; reject different fingerprint for same student
  const existingBind = session.deviceBindings.find(
    (b) => b.student.toString() === studentId.toString()
  );
  if (existingBind && existingBind.fingerprint !== deviceFingerprint) {
    return {
      clientScanId,
      status: "rejected",
      reason: "Device fingerprint mismatch (anti-proxy)",
    };
  }

  // Also reject if this fingerprint is already bound to a different student
  const fingerprintOwner = session.deviceBindings.find(
    (b) =>
      b.fingerprint === deviceFingerprint &&
      b.student.toString() !== studentId.toString()
  );
  if (fingerprintOwner) {
    return {
      clientScanId,
      status: "rejected",
      reason: "Device already used by another student (anti-proxy)",
    };
  }

  const student = await User.findById(studentId);
  if (student?.semester) {
    try {
      await checkSemesterFrozen(student.semester);
    } catch (err) {
      if (err.status === 403) {
        return { clientScanId, status: "rejected", reason: err.message };
      }
      throw err;
    }
  }

  const existing = await Attendance.findOne({
    student: studentId,
    course: session.course,
    date: session.date,
  });

  if (existing && existing.status === "present") {
    return {
      clientScanId,
      status: "duplicate",
      reason: "Already marked present",
      attendanceId: existing._id,
    };
  }

  const attendance = await Attendance.findOneAndUpdate(
    {
      student: studentId,
      course: session.course,
      date: session.date,
    },
    {
      status: "present",
      course: session.course,
      method,
      session: session._id,
      deviceFingerprint,
      geo: {
        lat: geo.lat,
        lng: geo.lng,
        accuracyM: geo.accuracyM,
      },
      scannedAt: scanTime,
      syncedAt: method === "qr_offline_sync" ? new Date() : undefined,
    },
    { upsert: true, new: true, runValidators: true, editorId: req.user.id }
  );

  if (!existingBind) {
    session.deviceBindings.push({
      student: studentId,
      fingerprint: deviceFingerprint,
      boundAt: new Date(),
    });
    session.markedCount = (session.markedCount || 0) + 1;
    await session.save();
  }

  emitMarked(req, session, {
    sessionId: session._id,
    studentId,
    name: student?.name,
    method,
    at: new Date().toISOString(),
  });

  return {
    clientScanId,
    status: "accepted",
    reason: null,
    attendanceId: attendance._id,
  };
}

/**
 * Student live scan.
 * POST /api/attendance/sessions/scan
 */
export const scanQrAttendance = asyncHandler(async (req, res) => {
  const { sessionId, totpCode, scannedAt, geo, deviceFingerprint } = req.body;

  const result = await processScan({
    req,
    studentId: req.user.id,
    sessionId,
    totpCode,
    scannedAt,
    geo,
    deviceFingerprint,
    method: "qr_totp",
  });

  if (result.status === "accepted") {
    await logAction(req.user.id, "QR_ATTENDANCE_SCAN", "Attendance", result.attendanceId, {
      sessionId,
    });
    return res.json({
      success: true,
      data: {
        status: "present",
        attendanceId: result.attendanceId,
        duplicate: false,
      },
    });
  }

  if (result.status === "duplicate") {
    return res.json({
      success: true,
      data: {
        status: "present",
        attendanceId: result.attendanceId,
        duplicate: true,
      },
    });
  }

  const code =
    result.reason?.includes("geofence") || result.reason?.includes("fingerprint")
      ? 403
      : result.reason?.includes("not found")
        ? 404
        : 400;

  throw new AppError(result.reason || "Scan rejected", code, "SCAN_REJECTED");
});

/**
 * Flush offline IndexedDB queue.
 * POST /api/attendance/sessions/sync
 */
export const syncOfflineQrScans = asyncHandler(async (req, res) => {
  const { scans } = req.body;
  if (!Array.isArray(scans) || scans.length === 0) {
    throw new AppError("scans array is required", 400, "MISSING_SCANS");
  }
  if (scans.length > 50) {
    throw new AppError("Maximum 50 scans per sync batch", 400, "BATCH_TOO_LARGE");
  }

  const results = [];
  for (const scan of scans) {
    const result = await processScan({
      req,
      studentId: req.user.id,
      sessionId: scan.sessionId,
      totpCode: scan.totpCode,
      scannedAt: scan.scannedAt,
      geo: scan.geo,
      deviceFingerprint: scan.deviceFingerprint,
      method: "qr_offline_sync",
      clientScanId: scan.clientScanId,
    });
    results.push(result);
  }

  await logAction(req.user.id, "QR_ATTENDANCE_OFFLINE_SYNC", "Attendance", null, {
    count: scans.length,
    accepted: results.filter((r) => r.status === "accepted").length,
  });

  res.json({ success: true, results });
});
