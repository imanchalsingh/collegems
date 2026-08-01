import crypto from "crypto";
import ProctoringLog from "../models/ProctoringLog.model.js";
import Quiz from "../models/Quiz.model.js";
import User from "../models/User.model.js";

const DEFAULT_MAX_WARNINGS = Number(process.env.PROCTORING_WARN_AFTER || 3);
const DEFAULT_MAX_VIOLATIONS = Number(process.env.PROCTORING_AUTOSUBMIT_AFTER || 8);

export const startProctoringSession = async (req, res) => {
  try {
    const { quizId } = req.body || {};
    if (!quizId) {
      return res.status(400).json({ message: "quizId is required" });
    }

    const quiz = await Quiz.findById(quizId).select("title");
    if (!quiz) {
      return res.status(404).json({ message: "Quiz not found" });
    }

    const studentId = req.user.id || req.user._id;
    const student = await User.findById(studentId).select("name");

    // End any previous active session for this quiz/student
    await ProctoringLog.updateMany(
      { quiz: quizId, student: studentId, status: "active" },
      { status: "aborted", endedAt: new Date() },
    );

    const sessionId = `PROC-${crypto.randomBytes(8).toString("hex").toUpperCase()}`;
    const log = await ProctoringLog.create({
      sessionId,
      quiz: quizId,
      student: studentId,
      studentName: student?.name || "",
      quizTitle: quiz.title,
      maxWarnings: DEFAULT_MAX_WARNINGS,
      maxViolations: DEFAULT_MAX_VIOLATIONS,
      status: "active",
    });

    const io = req.app.get("io");
    if (io) {
      io.to("teacher").to("hod").to("admin").emit("proctoring:session_started", {
        sessionId: log.sessionId,
        quizId,
        quizTitle: quiz.title,
        studentId,
        studentName: student?.name,
      });
    }

    res.status(201).json({
      sessionId: log.sessionId,
      maxWarnings: log.maxWarnings,
      maxViolations: log.maxViolations,
      startedAt: log.startedAt,
    });
  } catch (err) {
    console.error("startProctoringSession error:", err);
    res.status(500).json({ message: "Failed to start proctoring session" });
  }
};

export const recordViolation = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { type, message, meta } = req.body || {};
    if (!type) {
      return res.status(400).json({ message: "violation type is required" });
    }

    const log = await ProctoringLog.findOne({ sessionId });
    if (!log) {
      return res.status(404).json({ message: "Proctoring session not found" });
    }

    const studentId = String(req.user.id || req.user._id);
    if (String(log.student) !== studentId && !["teacher", "hod", "admin"].includes(req.user.role)) {
      return res.status(403).json({ message: "Not your proctoring session" });
    }

    if (log.status !== "active") {
      return res.status(409).json({
        message: "Session is no longer active",
        status: log.status,
        autoSubmitted: log.autoSubmitted,
      });
    }

    log.violations.push({
      type,
      message: message || type,
      meta: meta || {},
      at: new Date(),
    });

    if (typeof meta?.faceCount === "number") {
      log.lastFaceCount = meta.faceCount;
    }

    const total = log.violations.length;
    let warningIssued = false;
    let forceSubmit = false;

    if (total >= log.maxWarnings && total < log.maxViolations) {
      log.warningCount = total - log.maxWarnings + 1;
      warningIssued = true;
    }

    if (total >= log.maxViolations) {
      log.status = "auto_submitted";
      log.autoSubmitted = true;
      log.endedAt = new Date();
      forceSubmit = true;
    }

    await log.save();

    const io = req.app.get("io");
    const payload = {
      sessionId: log.sessionId,
      quizId: String(log.quiz),
      studentId: String(log.student),
      studentName: log.studentName,
      type,
      message: message || type,
      totalViolations: total,
      warningCount: log.warningCount,
      warningIssued,
      forceSubmit,
      autoSubmitted: log.autoSubmitted,
      at: new Date().toISOString(),
    };

    if (io) {
      io.to("teacher").to("hod").to("admin").emit("proctoring:violation", payload);
      io.to(`user_${studentId}`).emit("proctoring:violation_ack", payload);
      if (warningIssued) {
        io.to(`user_${studentId}`).emit("proctoring:warning", {
          sessionId: log.sessionId,
          warningCount: log.warningCount,
          totalViolations: total,
          maxWarnings: log.maxWarnings,
          maxViolations: log.maxViolations,
          message: `Proctoring warning ${log.warningCount}: suspicious activity detected (${type}).`,
        });
      }
      if (forceSubmit) {
        io.to(`user_${studentId}`).emit("proctoring:force_submit", {
          sessionId: log.sessionId,
          reason: "Maximum proctoring violations exceeded",
          totalViolations: total,
        });
      }
    }

    res.json({
      ok: true,
      totalViolations: total,
      warningCount: log.warningCount,
      warningIssued,
      forceSubmit,
      status: log.status,
    });
  } catch (err) {
    console.error("recordViolation error:", err);
    res.status(500).json({ message: "Failed to record violation" });
  }
};

export const endProctoringSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { reason = "completed" } = req.body || {};
    const log = await ProctoringLog.findOne({ sessionId });
    if (!log) {
      return res.status(404).json({ message: "Proctoring session not found" });
    }

    const studentId = String(req.user.id || req.user._id);
    if (String(log.student) !== studentId && !["teacher", "hod", "admin"].includes(req.user.role)) {
      return res.status(403).json({ message: "Not your proctoring session" });
    }

    if (log.status === "active") {
      log.status = reason === "auto_submitted" ? "auto_submitted" : "completed";
      if (reason === "auto_submitted") log.autoSubmitted = true;
      log.endedAt = new Date();
      await log.save();
    }

    res.json({
      sessionId: log.sessionId,
      status: log.status,
      totalViolations: log.violations.length,
      autoSubmitted: log.autoSubmitted,
    });
  } catch (err) {
    console.error("endProctoringSession error:", err);
    res.status(500).json({ message: "Failed to end session" });
  }
};

export const getQuizProctoringReport = async (req, res) => {
  try {
    const { quizId } = req.params;
    const logs = await ProctoringLog.find({ quiz: quizId })
      .populate("student", "name email studentId")
      .sort({ startedAt: -1 })
      .lean();

    const summary = {
      sessions: logs.length,
      autoSubmitted: logs.filter((l) => l.autoSubmitted).length,
      totalViolations: logs.reduce((n, l) => n + (l.violations?.length || 0), 0),
      byType: {},
    };

    for (const log of logs) {
      for (const v of log.violations || []) {
        summary.byType[v.type] = (summary.byType[v.type] || 0) + 1;
      }
    }

    res.json({ quizId, summary, sessions: logs });
  } catch (err) {
    console.error("getQuizProctoringReport error:", err);
    res.status(500).json({ message: "Failed to load proctoring report" });
  }
};

export const listProctoringSessions = async (req, res) => {
  try {
    const filter = {};
    if (req.query.quizId) filter.quiz = req.query.quizId;
    if (req.query.status) filter.status = req.query.status;

    const logs = await ProctoringLog.find(filter)
      .populate("student", "name email studentId")
      .populate("quiz", "title")
      .sort({ startedAt: -1 })
      .limit(100)
      .lean();

    res.json({ sessions: logs });
  } catch (err) {
    console.error("listProctoringSessions error:", err);
    res.status(500).json({ message: "Failed to list sessions" });
  }
};
