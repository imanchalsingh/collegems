import crypto from "crypto";
import PTMBooking from "../models/PTMBooking.model.js";
import User from "../models/User.model.js";
import Notification from "../models/Notification.model.js";
import { sendEmail } from "../utils/email.js";

const JITSI_BASE = process.env.JITSI_BASE_URL || "https://meet.jit.si";

const buildRoomId = () =>
  `SCMS-PTM-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;

const buildMeetingUrl = (roomId) => `${JITSI_BASE}/${roomId}`;

const notifyUser = async (userId, message) => {
  try {
    await Notification.create({
      recipient: userId,
      type: "system",
      message,
    });
  } catch {
    /* non-blocking */
  }
};

export const listTeachersForParent = async (req, res) => {
  try {
    const teachers = await User.find({
      role: "teacher",
      accountStatus: { $ne: "suspended" },
    })
      .select("name email department teacherId")
      .sort({ name: 1 });

    res.json({ success: true, data: teachers });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to load teachers",
      error: error.message,
    });
  }
};

export const createPTMRequest = async (req, res) => {
  try {
    if (req.user.role !== "parent") {
      return res.status(403).json({
        success: false,
        message: "Only parents can request PTM meetings",
      });
    }

    const { teacherId, scheduledAt, reason, durationMinutes } = req.body;
    if (!teacherId || !scheduledAt || !reason?.trim()) {
      return res.status(400).json({
        success: false,
        message: "teacherId, scheduledAt, and reason are required",
      });
    }

    const parent = await User.findById(req.user.id);
    if (!parent?.childId) {
      return res.status(400).json({
        success: false,
        message: "No linked child found on parent profile",
      });
    }

    const teacher = await User.findById(teacherId);
    if (!teacher || teacher.role !== "teacher") {
      return res.status(404).json({
        success: false,
        message: "Teacher not found",
      });
    }

    const when = new Date(scheduledAt);
    if (Number.isNaN(when.getTime()) || when.getTime() <= Date.now()) {
      return res.status(400).json({
        success: false,
        message: "Please choose a future meeting time",
      });
    }

    const roomId = buildRoomId();
    const booking = await PTMBooking.create({
      parent: parent._id,
      teacher: teacher._id,
      student: parent.childId,
      scheduledAt: when,
      durationMinutes: durationMinutes || 30,
      reason: reason.trim(),
      status: "pending",
      meetingRoomId: roomId,
      meetingUrl: buildMeetingUrl(roomId),
    });

    await notifyUser(
      teacher._id,
      `New PTM request from ${parent.name} for ${when.toLocaleString()}`
    );

    await sendEmail(
      teacher.email,
      "New Parent-Teacher Meeting Request",
      `Hello ${teacher.name},\n\n${parent.name} requested a video consultation on ${when.toLocaleString()}.\n\nReason: ${reason.trim()}\n\nPlease log in to approve or reject the request.\n\n— SCMS`
    ).catch(() => false);

    const populated = await PTMBooking.findById(booking._id)
      .populate("teacher", "name email department")
      .populate("student", "name studentId course semester")
      .populate("parent", "name email");

    res.status(201).json({ success: true, data: populated });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to create PTM request",
      error: error.message,
    });
  }
};

export const getMyPTMs = async (req, res) => {
  try {
    const filter =
      req.user.role === "parent"
        ? { parent: req.user.id }
        : req.user.role === "teacher"
          ? { teacher: req.user.id }
          : null;

    if (!filter) {
      return res.status(403).json({
        success: false,
        message: "Only parents and teachers can view PTM bookings",
      });
    }

    const bookings = await PTMBooking.find(filter)
      .populate("teacher", "name email department")
      .populate("student", "name studentId course semester")
      .populate("parent", "name email")
      .sort({ scheduledAt: 1 });

    res.json({ success: true, data: bookings });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch PTM bookings",
      error: error.message,
    });
  }
};

export const updatePTMStatus = async (req, res) => {
  try {
    const { status, rejectionReason } = req.body;
    const allowed = ["approved", "rejected", "cancelled", "completed"];
    if (!allowed.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `status must be one of: ${allowed.join(", ")}`,
      });
    }

    const booking = await PTMBooking.findById(req.params.id)
      .populate("parent", "name email")
      .populate("teacher", "name email")
      .populate("student", "name studentId");

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "PTM booking not found",
      });
    }

    const isTeacher = booking.teacher._id.toString() === req.user.id;
    const isParent = booking.parent._id.toString() === req.user.id;

    if (status === "cancelled") {
      if (!isParent && !isTeacher) {
        return res.status(403).json({ success: false, message: "Unauthorized" });
      }
    } else if (status === "approved" || status === "rejected" || status === "completed") {
      if (!isTeacher && req.user.role !== "hod") {
        return res.status(403).json({
          success: false,
          message: "Only the assigned teacher can update this status",
        });
      }
    }

    booking.status = status;
    if (status === "rejected") {
      booking.rejectionReason = rejectionReason || "Unavailable at requested time";
    }
    await booking.save();

    const notifyTarget =
      isTeacher || req.user.role === "hod" ? booking.parent._id : booking.teacher._id;
    await notifyUser(
      notifyTarget,
      `PTM meeting ${status}: ${booking.scheduledAt.toLocaleString()}`
    );

    if (status === "approved" && booking.parent.email) {
      await sendEmail(
        booking.parent.email,
        "PTM Approved — Video Meeting Confirmed",
        `Hello ${booking.parent.name},\n\nYour Parent-Teacher meeting with ${booking.teacher.name} on ${booking.scheduledAt.toLocaleString()} was approved.\n\nJoin link: ${booking.meetingUrl}\n\n— SCMS`
      ).catch(() => false);
    }

    res.json({ success: true, data: booking });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update PTM status",
      error: error.message,
    });
  }
};

export const updatePTMNotes = async (req, res) => {
  try {
    const { teacherNotes, actionItems } = req.body;
    const booking = await PTMBooking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "PTM booking not found",
      });
    }

    if (
      booking.teacher.toString() !== req.user.id &&
      req.user.role !== "hod"
    ) {
      return res.status(403).json({
        success: false,
        message: "Only the assigned teacher can edit meeting notes",
      });
    }

    if (typeof teacherNotes === "string") booking.teacherNotes = teacherNotes;
    if (Array.isArray(actionItems)) {
      booking.actionItems = actionItems
        .filter((item) => item && String(item.text || "").trim())
        .map((item) => ({
          text: String(item.text).trim(),
          done: Boolean(item.done),
        }));
    }

    await booking.save();

    const populated = await PTMBooking.findById(booking._id)
      .populate("teacher", "name email department")
      .populate("student", "name studentId course semester")
      .populate("parent", "name email");

    res.json({ success: true, data: populated });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to save meeting notes",
      error: error.message,
    });
  }
};

export const getPTMRoom = async (req, res) => {
  try {
    const booking = await PTMBooking.findById(req.params.id)
      .populate("teacher", "name")
      .populate("parent", "name")
      .populate("student", "name studentId");

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "PTM booking not found",
      });
    }

    const uid = req.user.id;
    const allowed =
      booking.parent._id.toString() === uid ||
      booking.teacher._id.toString() === uid ||
      req.user.role === "hod";

    if (!allowed) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    if (booking.status !== "approved" && booking.status !== "completed") {
      return res.status(400).json({
        success: false,
        message: "Meeting room is available only after approval",
      });
    }

    res.json({
      success: true,
      data: {
        meetingRoomId: booking.meetingRoomId,
        meetingUrl: booking.meetingUrl || buildMeetingUrl(booking.meetingRoomId),
        scheduledAt: booking.scheduledAt,
        durationMinutes: booking.durationMinutes,
        teacher: booking.teacher,
        parent: booking.parent,
        student: booking.student,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to load meeting room",
      error: error.message,
    });
  }
};
