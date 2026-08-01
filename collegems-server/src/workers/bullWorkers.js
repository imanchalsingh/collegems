import { Worker } from "bullmq";
import { getRedisOptions, isRedisMockMode } from "../config/redis.config.js";
import { QUEUE_NAMES, isBullEnabled } from "../queues/queue.registry.js";
import { processEmailJob } from "./emailWorker.js";
import { processReportPdfJob } from "./reportWorker.js";
import { processAnalyticsJob } from "./analyticsWorker.js";
import { emitJobEvent } from "../queues/jobProgress.js";
import { setWorkerIo, getWorkerIo } from "./workerIo.js";

let workers = [];

function attachWorkerEvents(worker, queueLabel) {
  worker.on("failed", (job, err) => {
    emitJobEvent(getWorkerIo(), "queue:job_failed", {
      queue: queueLabel,
      jobId: job?.id,
      requestedBy: job?.data?.requestedBy,
      error: err.message,
    });
  });
  worker.on("error", (err) => {
    console.warn(`[${queueLabel}] worker error:`, err.message);
  });
}

export function startBullWorkers(io) {
  setWorkerIo(io);

  if (isRedisMockMode() || !isBullEnabled()) {
    console.warn("BullMQ workers skipped (Redis mock / queues not enabled)");
    return [];
  }

  const connection = getRedisOptions();
  const common = { connection, concurrency: 2 };

  const email = new Worker(
    QUEUE_NAMES.EMAIL,
    async (job) => processEmailJob(job, getWorkerIo()),
    common
  );
  const report = new Worker(
    QUEUE_NAMES.REPORT_PDF,
    async (job) => processReportPdfJob(job, getWorkerIo()),
    common
  );
  const analytics = new Worker(
    QUEUE_NAMES.ANALYTICS,
    async (job) => processAnalyticsJob(job, getWorkerIo()),
    { ...common, concurrency: 1 }
  );

  attachWorkerEvents(email, QUEUE_NAMES.EMAIL);
  attachWorkerEvents(report, QUEUE_NAMES.REPORT_PDF);
  attachWorkerEvents(analytics, QUEUE_NAMES.ANALYTICS);

  workers = [email, report, analytics];
  console.log("BullMQ workers started for Email / ReportPDF / Analytics");
  return workers;
}

export async function stopBullWorkers() {
  await Promise.allSettled(workers.map((w) => w.close()));
  workers = [];
}
