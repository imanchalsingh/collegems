import cron from "node-cron";
import Complaint from "../models/Complaint.model.js";
import User from "../models/User.model.js";
import Notification from "../models/Notification.model.js";
import { sendEmail } from "../utils/email.js";
import {
  computeSlaDeadline,
  getEscalationChain,
  getHandlerLabel,
} from "../utils/slaEscalation.js";

const OPEN_STATUSES = ["Submitted", "Under Review", "In Progress"];

const findEscalationAssignee = async (toLevel) => {
  if (toLevel >= 2) {
    return User.findOne({ role: "hod", accountStatus: "active" }).select(
      "name email role"
    );
  }
  if (toLevel === 1) {
    const admin = await User.findOne({
      role: "admin",
      accountStatus: "active",
    }).select("name email role");
    if (admin) return admin;
  }
  return User.findOne({ role: "teacher", accountStatus: "active" }).select(
    "name email role"
  );
};

export const escalateComplaint = async (complaint, reason = "SLA deadline expired") => {
  const chain = getEscalationChain(complaint.category);
  const fromLevel = complaint.escalationLevel || 0;
  const maxLevel = chain.length - 1;

  if (fromLevel >= maxLevel) {
    complaint.slaBreached = true;
    // Keep pressure on final level — refresh a short SLA window
    complaint.slaDeadline = computeSlaDeadline(new Date(), "High");
    complaint.lastEscalatedAt = new Date();
    await complaint.save();
    return { escalated: false, reason: "Already at top escalation level", complaint };
  }

  const toLevel = fromLevel + 1;
  const fromHandler = getHandlerLabel(complaint.category, fromLevel);
  const toHandler = getHandlerLabel(complaint.category, toLevel);
  const assignee = await findEscalationAssignee(toLevel);

  complaint.escalationLevel = toLevel;
  complaint.currentHandlerRole = toHandler;
  complaint.slaBreached = true;
  complaint.lastEscalatedAt = new Date();
  complaint.slaDeadline = computeSlaDeadline(new Date(), complaint.priority);
  if (assignee) complaint.assignedTo = assignee._id;
  if (complaint.status === "Submitted") complaint.status = "Under Review";

  const notifiedEmails = [];
  if (assignee?.email) {
    notifiedEmails.push(assignee.email);
    await Notification.create({
      recipient: assignee._id,
      type: "system",
      message: `Complaint escalated to ${toHandler}: "${complaint.title}" (SLA breach)`,
    }).catch(() => null);

    await sendEmail(
      assignee.email,
      `[SLA Escalation] Complaint assigned to ${toHandler}`,
      `A campus grievance has been escalated to you (${toHandler}).\n\nTitle: ${complaint.title}\nCategory: ${complaint.category}\nPriority: ${complaint.priority}\nReason: ${reason}\nTracking: ${complaint.anonymousTrackingId || complaint._id}`
    ).catch(() => false);
  }

  // Always notify HOD on escalation
  const hod = await User.findOne({ role: "hod", accountStatus: "active" }).select(
    "_id email"
  );
  if (hod && (!assignee || hod._id.toString() !== assignee._id.toString())) {
    if (hod.email) {
      notifiedEmails.push(hod.email);
      await sendEmail(
        hod.email,
        `[SLA Escalation Alert] ${complaint.category} grievance`,
        `Complaint "${complaint.title}" escalated from ${fromHandler} → ${toHandler}.\nPriority: ${complaint.priority}\nReason: ${reason}`
      ).catch(() => false);
    }
    await Notification.create({
      recipient: hod._id,
      type: "system",
      message: `SLA escalation: ${complaint.title} → ${toHandler}`,
    }).catch(() => null);
  }

  complaint.escalationHistory.push({
    fromLevel,
    toLevel,
    fromHandler,
    toHandler,
    reason,
    escalatedAt: new Date(),
    notifiedEmails,
  });

  await complaint.save();
  return { escalated: true, fromHandler, toHandler, complaint };
};

export const processSlaEscalations = async () => {
  const now = new Date();
  const dueComplaints = await Complaint.find({
    status: { $in: OPEN_STATUSES },
    slaDeadline: { $lte: now },
  });

  const results = [];
  for (const complaint of dueComplaints) {
    try {
      const result = await escalateComplaint(complaint);
      results.push({
        id: complaint._id,
        escalated: result.escalated,
        toHandler: result.toHandler || complaint.currentHandlerRole,
      });
    } catch (error) {
      console.error(`SLA escalation failed for ${complaint._id}:`, error.message);
      results.push({ id: complaint._id, error: error.message });
    }
  }

  return {
    checkedAt: now.toISOString(),
    processed: results.length,
    results,
  };
};

export const startSlaEscalationCron = () => {
  // Every 15 minutes
  cron.schedule("*/15 * * * *", async () => {
    try {
      const summary = await processSlaEscalations();
      if (summary.processed > 0) {
        console.log(
          `[SLA Cron] Processed ${summary.processed} complaint(s) at ${summary.checkedAt}`
        );
      }
    } catch (error) {
      console.error("[SLA Cron] Error:", error.message);
    }
  });
  console.log("[SLA Cron] Escalation monitor scheduled (every 15 minutes)");
};
