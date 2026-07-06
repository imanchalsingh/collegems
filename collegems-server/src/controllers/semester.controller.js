import Semester from "../models/Semester.model.js";
import { logAction } from "../utils/auditService.js";

// ─── GET ALL SEMESTERS ────────────────────────────────────────────────────────
/**
 * @route   GET /api/semesters
 * @access  Authenticated
 * Returns all semester/session records sorted with the active session first,
 * then the rest by semester name.
 */
export const getSemesters = async (req, res) => {
  try {
    const semesters = await Semester.find()
      .sort({ isActive: -1, createdAt: -1 })
      .populate("frozenBy", "name")
      .populate("activatedBy", "name");
    res.json(semesters);
  } catch (error) {
    console.error("Get Semesters Error:", error);
    res.status(500).json({ message: "Failed to fetch semesters" });
  }
};

// ─── CREATE OR ACTIVATE SESSION ───────────────────────────────────────────────
/**
 * @route   POST /api/semesters/activate
 * @access  HOD / Admin
 * Creates (or finds) the target semester and marks it as the one active session.
 * All previously-active sessions are automatically frozen (read-only).
 */
export const createOrActivateSession = async (req, res) => {
  try {
    const { semester } = req.body;

    if (!semester || !String(semester).trim()) {
      return res.status(400).json({ message: "Semester / session name is required" });
    }

    const semesterStr = String(semester).trim();
    const now = new Date();
    const adminId = req.user.id;

    // ── Step 1: Auto-close all currently-active sessions ──────────────────────
    const previouslyActive = await Semester.find({ isActive: true });

    for (const prev of previouslyActive) {
      prev.isActive = false;
      prev.isFrozen = true;
      prev.frozenBy = adminId;
      prev.deactivatedAt = now;
      await prev.save();

      await logAction(
        adminId,
        "DEACTIVATE_SEMESTER",
        "Semester",
        prev._id,
        { semester: prev.semester, reason: `Auto-closed when activating new session: ${semesterStr}` }
      );
    }

    // ── Step 2: Find or create the target session ─────────────────────────────
    let target = await Semester.findOne({ semester: semesterStr });

    if (!target) {
      target = new Semester({ semester: semesterStr });
    }

    target.isActive = true;
    target.isFrozen = false;
    target.frozenBy = null;
    target.activatedAt = now;
    target.deactivatedAt = null;
    target.activatedBy = adminId;
    await target.save();

    await logAction(
      adminId,
      "ACTIVATE_SEMESTER",
      "Semester",
      target._id,
      { semester: semesterStr, previouslyClosed: previouslyActive.map((p) => p.semester) }
    );

    res.status(200).json({
      message: `Session "${semesterStr}" is now the active academic session. ${previouslyActive.length} previous session(s) have been frozen.`,
      data: target,
      closedSessions: previouslyActive.map((p) => p.semester),
    });
  } catch (error) {
    console.error("Activate Session Error:", error);
    res.status(500).json({ message: "Failed to activate academic session" });
  }
};

// ─── TOGGLE SEMESTER FREEZE ───────────────────────────────────────────────────
/**
 * @route   POST /api/semesters/:semesterStr/toggle
 * @access  HOD / Admin
 * Manually freeze or unfreeze a semester. Does not change the isActive flag.
 */
export const toggleSemesterFreeze = async (req, res) => {
  try {
    const { semesterStr } = req.params;
    const { isFrozen } = req.body;

    if (typeof isFrozen !== "boolean") {
      return res.status(400).json({ message: "isFrozen must be a boolean" });
    }

    let semester = await Semester.findOne({ semester: semesterStr });
    
    if (!semester) {
      // Create it if it doesn't exist
      semester = new Semester({
        semester: semesterStr,
        isFrozen,
        frozenBy: isFrozen ? req.user.id : null,
      });
      await semester.save();
    } else {
      semester.isFrozen = isFrozen;
      semester.frozenBy = isFrozen ? req.user.id : null;
      await semester.save();
    }

    // Log the action
    const actionType = isFrozen ? "FREEZE_SEMESTER" : "UNFREEZE_SEMESTER";
    await logAction(req.user.id, actionType, "Semester", semester._id, { semester: semesterStr });

    res.json({ message: `Semester ${semesterStr} is now ${isFrozen ? "frozen" : "unfrozen"}`, data: semester });
  } catch (error) {
    console.error("Toggle Semester Freeze Error:", error);
    res.status(500).json({ message: "Failed to update semester freeze status" });
  }
};

// ─── REOPEN SESSION ───────────────────────────────────────────────────────────
/**
 * @route   POST /api/semesters/:semesterStr/reopen
 * @access  HOD / Admin
 * Manually reopens (unfreezes) a previously-frozen session.
 * Does NOT automatically deactivate the currently-active session —
 * admin is responsible for managing multiple open sessions if needed.
 */
export const reopenSession = async (req, res) => {
  try {
    const { semesterStr } = req.params;

    const semester = await Semester.findOne({ semester: semesterStr });

    if (!semester) {
      return res.status(404).json({ message: `Session "${semesterStr}" not found` });
    }

    semester.isFrozen = false;
    semester.frozenBy = null;
    semester.deactivatedAt = null;
    await semester.save();

    await logAction(
      req.user.id,
      "REOPEN_SEMESTER",
      "Semester",
      semester._id,
      { semester: semesterStr }
    );

    res.json({
      message: `Session "${semesterStr}" has been reopened and is no longer read-only.`,
      data: semester,
    });
  } catch (error) {
    console.error("Reopen Session Error:", error);
    res.status(500).json({ message: "Failed to reopen session" });
  }
};
