import {
  QUEUE_NAMES,
  enqueueJob,
  isBullEnabled,
  getEmailQueue,
  getReportPdfQueue,
  getAnalyticsQueue,
  listMemoryJobs,
  memoryQueueCounts,
  getMemoryJob,
} from "../queues/queue.registry.js";
import { isRedisMockMode, isRedisReady } from "../config/redis.config.js";

export async function enqueueBulkEmail(recipients, requestedBy) {
  return enqueueJob(QUEUE_NAMES.EMAIL, "bulk-email", {
    recipients,
    requestedBy,
  });
}

export async function enqueueSingleEmail({ to, subject, text, html }, requestedBy) {
  return enqueueJob(QUEUE_NAMES.EMAIL, "single-email", {
    to,
    subject,
    text,
    html,
    requestedBy,
  });
}

export async function enqueueReportPdf(payload, requestedBy) {
  return enqueueJob(QUEUE_NAMES.REPORT_PDF, "generate-report-pdf", {
    ...payload,
    requestedBy,
  });
}

export async function enqueueAnalytics(payload, requestedBy) {
  return enqueueJob(QUEUE_NAMES.ANALYTICS, "batch-analytics", {
    ...payload,
    requestedBy,
  });
}

function serializeBullJob(job, state) {
  return {
    id: String(job.id),
    name: job.name,
    queueName: job.queueName,
    state,
    progress: typeof job.progress === "number" ? job.progress : job.progress || 0,
    attemptsMade: job.attemptsMade,
    failedReason: job.failedReason || null,
    timestamp: job.timestamp,
    finishedOn: job.finishedOn,
    processedOn: job.processedOn,
    data: {
      requestedBy: job.data?.requestedBy,
      to: job.data?.to,
      title: job.data?.title,
      recipientCount: job.data?.recipients?.length,
    },
  };
}

async function bullQueueSnapshot(queue, queueName) {
  if (!queue) {
    return {
      name: queueName,
      counts: memoryQueueCounts(queueName),
      jobs: listMemoryJobs(queueName).map((j) => ({
        id: j.id,
        name: j.name,
        queueName: j.queueName,
        state: j.state,
        progress: j.progress,
        attemptsMade: j.attemptsMade,
        failedReason: j.failedReason,
        timestamp: j.timestamp,
        finishedOn: j.finishedOn,
        processedOn: j.processedOn,
        data: {
          requestedBy: j.data?.requestedBy,
          to: j.data?.to,
          title: j.data?.title,
          recipientCount: j.data?.recipients?.length,
        },
      })),
    };
  }

  const counts = await queue.getJobCounts(
    "waiting",
    "active",
    "completed",
    "failed",
    "delayed"
  );
  const [waiting, active, completed, failed] = await Promise.all([
    queue.getJobs(["waiting"], 0, 20),
    queue.getJobs(["active"], 0, 20),
    queue.getJobs(["completed"], 0, 20),
    queue.getJobs(["failed"], 0, 20),
  ]);

  const jobs = [
    ...active.map((j) => serializeBullJob(j, "active")),
    ...waiting.map((j) => serializeBullJob(j, "waiting")),
    ...failed.map((j) => serializeBullJob(j, "failed")),
    ...completed.map((j) => serializeBullJob(j, "completed")),
  ];

  return { name: queueName, counts, jobs };
}

export async function getQueueDashboard() {
  const mode = isBullEnabled() ? "bullmq" : "memory";
  const queues = await Promise.all([
    bullQueueSnapshot(getEmailQueue(), QUEUE_NAMES.EMAIL),
    bullQueueSnapshot(getReportPdfQueue(), QUEUE_NAMES.REPORT_PDF),
    bullQueueSnapshot(getAnalyticsQueue(), QUEUE_NAMES.ANALYTICS),
  ]);

  return {
    mode,
    redis: {
      mock: isRedisMockMode(),
      ready: isRedisReady(),
    },
    queues,
    totals: queues.reduce(
      (acc, q) => {
        acc.waiting += q.counts.waiting || 0;
        acc.active += q.counts.active || 0;
        acc.completed += q.counts.completed || 0;
        acc.failed += q.counts.failed || 0;
        return acc;
      },
      { waiting: 0, active: 0, completed: 0, failed: 0 }
    ),
  };
}

export async function getJobStatus(queueName, jobId) {
  if (!isBullEnabled()) {
    const job = getMemoryJob(jobId);
    if (!job) return null;
    return {
      id: job.id,
      name: job.name,
      queueName: job.queueName,
      state: job.state,
      progress: job.progress,
      failedReason: job.failedReason,
      returnvalue: job.returnvalue,
    };
  }

  const q =
    queueName === QUEUE_NAMES.EMAIL
      ? getEmailQueue()
      : queueName === QUEUE_NAMES.REPORT_PDF
        ? getReportPdfQueue()
        : getAnalyticsQueue();
  if (!q) return null;
  const job = await q.getJob(jobId);
  if (!job) return null;
  const state = await job.getState();
  return serializeBullJob(job, state);
}
