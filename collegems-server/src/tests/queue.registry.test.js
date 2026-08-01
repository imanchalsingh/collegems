import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  QUEUE_NAMES,
  enqueueJob,
  listMemoryJobs,
  memoryQueueCounts,
  initQueues,
} from "../queues/queue.registry.js";

describe("queue.registry memory fallback", () => {
  it("exposes canonical queue names", () => {
    assert.equal(QUEUE_NAMES.EMAIL, "EmailQueue");
    assert.equal(QUEUE_NAMES.REPORT_PDF, "ReportPDFQueue");
    assert.equal(QUEUE_NAMES.ANALYTICS, "AnalyticsQueue");
  });

  it("enqueues into memory when Bull is not enabled", async () => {
    process.env.MOCK_REDIS = "true";
    await initQueues();
    const job = await enqueueJob(QUEUE_NAMES.EMAIL, "single-email", {
      to: "a@b.com",
      subject: "t",
      text: "hello",
    });
    assert.ok(job.id);
    assert.equal(job.mode, "memory");
    const listed = listMemoryJobs(QUEUE_NAMES.EMAIL, 5);
    assert.ok(listed.some((j) => j.id === job.id));
    const counts = memoryQueueCounts(QUEUE_NAMES.EMAIL);
    assert.ok(counts.waiting + counts.active + counts.completed + counts.failed >= 1);
  });
});
