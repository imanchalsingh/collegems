import { Queue } from "bullmq";
import { getRedisOptions, isRedisMockMode } from "../config/redis.config.js";

export const QUEUE_NAMES = {
  EMAIL: "EmailQueue",
  REPORT_PDF: "ReportPDFQueue",
  ANALYTICS: "AnalyticsQueue",
};

/** In-memory job store when Redis is down (demo / CI). */
const memoryJobs = new Map(); // id -> job record
const memoryByQueue = {
  [QUEUE_NAMES.EMAIL]: [],
  [QUEUE_NAMES.REPORT_PDF]: [],
  [QUEUE_NAMES.ANALYTICS]: [],
};

let emailQueue = null;
let reportPdfQueue = null;
let analyticsQueue = null;
let bullEnabled = false;

function makeMemoryJob(queueName, name, data, opts = {}) {
  const id = `mem_${queueName}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const job = {
    id,
    name,
    queueName,
    data,
    opts,
    progress: 0,
    state: "waiting",
    attemptsMade: 0,
    failedReason: null,
    returnvalue: null,
    timestamp: Date.now(),
    finishedOn: null,
    processedOn: null,
  };
  memoryJobs.set(id, job);
  memoryByQueue[queueName].unshift(id);
  if (memoryByQueue[queueName].length > 200) {
    const old = memoryByQueue[queueName].pop();
    memoryJobs.delete(old);
  }
  return job;
}

export function getMemoryJob(id) {
  return memoryJobs.get(id) || null;
}

export function updateMemoryJob(id, patch) {
  const job = memoryJobs.get(id);
  if (!job) return null;
  Object.assign(job, patch);
  return job;
}

export function listMemoryJobs(queueName, limit = 50) {
  const ids = memoryByQueue[queueName] || [];
  return ids.slice(0, limit).map((id) => memoryJobs.get(id)).filter(Boolean);
}

export function memoryQueueCounts(queueName) {
  const jobs = listMemoryJobs(queueName, 500);
  return {
    waiting: jobs.filter((j) => j.state === "waiting").length,
    active: jobs.filter((j) => j.state === "active").length,
    completed: jobs.filter((j) => j.state === "completed").length,
    failed: jobs.filter((j) => j.state === "failed").length,
    delayed: jobs.filter((j) => j.state === "delayed").length,
  };
}

/**
 * Initialize BullMQ queues (call once after Redis connect attempt).
 */
export async function initQueues() {
  if (isRedisMockMode()) {
    bullEnabled = false;
    console.warn("BullMQ queues: in-memory fallback mode");
    return { bullEnabled: false };
  }

  try {
    const connection = getRedisOptions();
    const defaults = {
      connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: "exponential", delay: 2000 },
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 200 },
      },
    };

    emailQueue = new Queue(QUEUE_NAMES.EMAIL, defaults);
    reportPdfQueue = new Queue(QUEUE_NAMES.REPORT_PDF, defaults);
    analyticsQueue = new Queue(QUEUE_NAMES.ANALYTICS, defaults);
    bullEnabled = true;
    console.log("BullMQ queues ready:", Object.values(QUEUE_NAMES).join(", "));
    return { bullEnabled: true };
  } catch (err) {
    bullEnabled = false;
    console.warn("BullMQ init failed, using memory fallback:", err.message);
    return { bullEnabled: false };
  }
}

export function isBullEnabled() {
  return bullEnabled;
}

export function getEmailQueue() {
  return emailQueue;
}
export function getReportPdfQueue() {
  return reportPdfQueue;
}
export function getAnalyticsQueue() {
  return analyticsQueue;
}

/**
 * Enqueue a job — BullMQ when available, else in-memory.
 */
export async function enqueueJob(queueName, jobName, data, opts = {}) {
  if (bullEnabled) {
    const q =
      queueName === QUEUE_NAMES.EMAIL
        ? emailQueue
        : queueName === QUEUE_NAMES.REPORT_PDF
          ? reportPdfQueue
          : analyticsQueue;
    if (!q) throw new Error(`Queue ${queueName} not initialized`);
    const job = await q.add(jobName, data, opts);
    return {
      id: String(job.id),
      name: jobName,
      queueName,
      mode: "bullmq",
    };
  }

  const job = makeMemoryJob(queueName, jobName, data, opts);
  // Process asynchronously via memory worker hook
  setImmediate(() => {
    import("../workers/memoryWorkerBridge.js")
      .then((m) => m.processMemoryJob(job))
      .catch((err) => {
        updateMemoryJob(job.id, {
          state: "failed",
          failedReason: err.message,
          finishedOn: Date.now(),
        });
      });
  });

  return {
    id: job.id,
    name: jobName,
    queueName,
    mode: "memory",
  };
}

export async function closeQueues() {
  await Promise.allSettled([
    emailQueue?.close(),
    reportPdfQueue?.close(),
    analyticsQueue?.close(),
  ]);
  emailQueue = null;
  reportPdfQueue = null;
  analyticsQueue = null;
  bullEnabled = false;
}
