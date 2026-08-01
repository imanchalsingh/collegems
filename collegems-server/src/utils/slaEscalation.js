import crypto from "crypto";

/** SLA hours by priority (High/Critical = Urgent 12h). */
export const SLA_HOURS = {
  Low: 72,
  Medium: 48,
  High: 12,
  Critical: 12,
};

/**
 * Category-based escalation matrix labels.
 * Levels escalate upward when the current SLA deadline expires.
 */
export const ESCALATION_MATRIX = {
  Hostel: ["Hostel Warden", "Dean of Students", "HOD"],
  Academic: ["Academic Coordinator", "Dean Academics", "HOD"],
  Ragging: ["Anti-Ragging Cell", "Dean of Students", "HOD"],
  Infrastructure: ["Infrastructure Officer", "Dean Administration", "HOD"],
  Transport: ["Transport Officer", "Dean Administration", "HOD"],
  Technical: ["IT Support Lead", "Dean Administration", "HOD"],
  Administration: ["Admin Officer", "Dean Administration", "HOD"],
};

export const getSlaHours = (priority = "Medium") =>
  SLA_HOURS[priority] ?? SLA_HOURS.Medium;

export const computeSlaDeadline = (fromDate = new Date(), priority = "Medium") => {
  const deadline = new Date(fromDate);
  deadline.setHours(deadline.getHours() + getSlaHours(priority));
  return deadline;
};

export const getEscalationChain = (category = "Administration") =>
  ESCALATION_MATRIX[category] || ESCALATION_MATRIX.Administration;

export const getHandlerLabel = (category, level = 0) => {
  const chain = getEscalationChain(category);
  const idx = Math.min(Math.max(level, 0), chain.length - 1);
  return chain[idx];
};

export const generateAnonymousTrackingId = () => {
  const token = crypto.randomBytes(4).toString("hex").toUpperCase();
  return `GRV-${token}`;
};

export const hashTrackingSecret = (trackingId) =>
  crypto.createHash("sha256").update(String(trackingId)).digest("hex");

export const getSlaStatus = (complaint, now = new Date()) => {
  if (["Resolved", "Closed"].includes(complaint.status)) {
    return {
      state: "resolved",
      remainingMs: 0,
      breached: false,
      percentElapsed: 100,
    };
  }

  const deadline = complaint.slaDeadline
    ? new Date(complaint.slaDeadline)
    : null;
  if (!deadline) {
    return {
      state: "unknown",
      remainingMs: null,
      breached: Boolean(complaint.slaBreached),
      percentElapsed: 0,
    };
  }

  const start = complaint.lastEscalatedAt
    ? new Date(complaint.lastEscalatedAt)
    : new Date(complaint.createdAt);
  const totalMs = Math.max(deadline.getTime() - start.getTime(), 1);
  const remainingMs = deadline.getTime() - now.getTime();
  const elapsedMs = now.getTime() - start.getTime();
  const percentElapsed = Math.min(100, Math.max(0, (elapsedMs / totalMs) * 100));

  if (remainingMs <= 0) {
    return {
      state: "breached",
      remainingMs: 0,
      breached: true,
      percentElapsed: 100,
    };
  }

  const hoursLeft = remainingMs / (1000 * 60 * 60);
  return {
    state: hoursLeft <= 6 ? "critical" : hoursLeft <= 24 ? "warning" : "ok",
    remainingMs,
    breached: false,
    percentElapsed: Math.round(percentElapsed * 10) / 10,
  };
};

export const formatRemaining = (remainingMs) => {
  if (remainingMs === null || remainingMs === undefined) return "N/A";
  if (remainingMs <= 0) return "SLA expired";
  const totalMinutes = Math.floor(remainingMs / 60000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return `${days}d ${hours}h remaining`;
  if (hours > 0) return `${hours}h ${minutes}m remaining`;
  return `${minutes}m remaining`;
};
