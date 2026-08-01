import {
  updateMemoryJob,
  QUEUE_NAMES,
} from "../queues/queue.registry.js";
import { processEmailJob } from "./emailWorker.js";
import { processReportPdfJob } from "./reportWorker.js";
import { processAnalyticsJob } from "./analyticsWorker.js";
import { getWorkerIo } from "./workerIo.js";

/**
 * Process in-memory fallback jobs when Redis is unavailable.
 */
export async function processMemoryJob(job) {
  const io = getWorkerIo();
  updateMemoryJob(job.id, { state: "active", processedOn: Date.now(), progress: 1 });

  const fakeBullJob = {
    id: job.id,
    name: job.name,
    data: job.data,
    updateProgress: async (p) => {
      updateMemoryJob(job.id, { progress: p });
    },
  };

  try {
    let result;
    if (job.queueName === QUEUE_NAMES.EMAIL) {
      result = await processEmailJob(fakeBullJob, io);
    } else if (job.queueName === QUEUE_NAMES.REPORT_PDF) {
      result = await processReportPdfJob(fakeBullJob, io);
    } else if (job.queueName === QUEUE_NAMES.ANALYTICS) {
      result = await processAnalyticsJob(fakeBullJob, io);
    } else {
      throw new Error(`Unknown queue ${job.queueName}`);
    }
    updateMemoryJob(job.id, {
      state: "completed",
      progress: 100,
      returnvalue: result,
      finishedOn: Date.now(),
    });
  } catch (err) {
    updateMemoryJob(job.id, {
      state: "failed",
      failedReason: err.message,
      finishedOn: Date.now(),
    });
    throw err;
  }
}
