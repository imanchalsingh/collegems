import { emitJobProgress, emitJobEvent } from "../queues/jobProgress.js";

/**
 * Heavy analytics batch — wraps existing analytics service when available.
 * data: { studentIds?: string[], requestedBy }
 */
export async function processAnalyticsJob(job, io) {
  const data = job.data || {};
  const requestedBy = data.requestedBy;
  const jobId = String(job.id);

  const emit = (progress, status, extra = {}) => {
    emitJobProgress(io, {
      queue: "AnalyticsQueue",
      jobId,
      name: job.name,
      progress,
      status,
      requestedBy,
      ...extra,
    });
  };

  emit(5, "active");

  let processed = 0;
  try {
    const { batchGenerateAnalytics, generateAnalyticsForStudent } =
      await import("../services/analytics.service.js");

    if (Array.isArray(data.studentIds) && data.studentIds.length) {
      const total = data.studentIds.length;
      for (let i = 0; i < total; i++) {
        try {
          await generateAnalyticsForStudent(data.studentIds[i]);
          processed += 1;
        } catch {
          /* continue batch */
        }
        const progress = Math.round(((i + 1) / total) * 100);
        if (typeof job.updateProgress === "function") {
          await job.updateProgress(progress);
        }
        emit(progress, "active", { processed, total });
      }
      emit(100, "completed", { processed, total });
      emitJobEvent(io, "queue:job_completed", {
        queue: "AnalyticsQueue",
        jobId,
        requestedBy,
        result: { processed, total },
      });
      return { processed, total };
    }

    // Full batch — fire existing helper then mark complete
    emit(30, "active");
    if (typeof batchGenerateAnalytics === "function") {
      // Don't await forever if it self-schedules; race with timeout
      await Promise.race([
        batchGenerateAnalytics(),
        new Promise((r) => setTimeout(r, 2000)),
      ]);
    }
    if (typeof job.updateProgress === "function") await job.updateProgress(100);
    emit(100, "completed", { processed: "batch" });
    emitJobEvent(io, "queue:job_completed", {
      queue: "AnalyticsQueue",
      jobId,
      requestedBy,
      result: { mode: "batch" },
    });
    return { mode: "batch" };
  } catch (err) {
    emit(100, "failed", { error: err.message });
    throw err;
  }
}
