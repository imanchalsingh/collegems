import { sendEmail } from "../utils/email.js";
import { emitJobProgress, emitJobEvent } from "../queues/jobProgress.js";

/**
 * Process email jobs: single or bulk.
 * data: { to, subject, text, html } | { recipients: [{to,subject,text,html}], requestedBy }
 */
export async function processEmailJob(job, io) {
  const data = job.data || {};
  const requestedBy = data.requestedBy;
  const jobId = String(job.id);

  const emit = (progress, status, extra = {}) => {
    emitJobProgress(io, {
      queue: "EmailQueue",
      jobId,
      name: job.name,
      progress,
      status,
      requestedBy,
      ...extra,
    });
  };

  emit(5, "active");

  if (Array.isArray(data.recipients) && data.recipients.length) {
    const total = data.recipients.length;
    let sent = 0;
    let failed = 0;
    for (let i = 0; i < total; i++) {
      const r = data.recipients[i];
      const ok = await sendEmail(r.to, r.subject, r.text || "", r.html || "");
      if (ok) sent += 1;
      else failed += 1;
      const progress = Math.round(((i + 1) / total) * 100);
      if (typeof job.updateProgress === "function") {
        await job.updateProgress(progress);
      }
      emit(progress, "active", { sent, failed, total });
    }
    emit(100, "completed", { sent, failed, total });
    emitJobEvent(io, "queue:job_completed", {
      queue: "EmailQueue",
      jobId,
      requestedBy,
      result: { sent, failed, total },
    });
    return { sent, failed, total };
  }

  const ok = await sendEmail(
    data.to,
    data.subject,
    data.text || "",
    data.html || ""
  );
  if (typeof job.updateProgress === "function") await job.updateProgress(100);
  if (!ok) {
    emit(100, "failed", { error: "sendEmail returned false" });
    throw new Error("Failed to send email");
  }
  emit(100, "completed");
  emitJobEvent(io, "queue:job_completed", {
    queue: "EmailQueue",
    jobId,
    requestedBy,
    result: { sent: 1 },
  });
  return { sent: 1 };
}
