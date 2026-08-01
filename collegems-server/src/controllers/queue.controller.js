import {
  enqueueBulkEmail,
  enqueueSingleEmail,
  enqueueReportPdf,
  enqueueAnalytics,
  getQueueDashboard,
  getJobStatus,
} from "../services/queue.service.js";
import { QUEUE_NAMES } from "../queues/queue.registry.js";

export const getDashboard = async (req, res) => {
  try {
    const data = await getQueueDashboard();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getJob = async (req, res) => {
  try {
    const job = await getJobStatus(req.params.queueName, req.params.jobId);
    if (!job) {
      return res.status(404).json({ success: false, message: "Job not found" });
    }
    res.json({ success: true, data: job });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const enqueueEmailJob = async (req, res) => {
  try {
    const { to, subject, text, html, recipients } = req.body;
    let result;
    if (Array.isArray(recipients) && recipients.length) {
      result = await enqueueBulkEmail(recipients, req.user.id);
    } else {
      if (!to || !subject) {
        return res.status(400).json({ message: "to and subject are required" });
      }
      result = await enqueueSingleEmail(
        { to, subject, text, html },
        req.user.id
      );
    }
    res.status(202).json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const enqueueReportJob = async (req, res) => {
  try {
    const { title, lines, fileName } = req.body;
    const result = await enqueueReportPdf(
      { title, lines, fileName },
      req.user.id
    );
    res.status(202).json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const enqueueAnalyticsJob = async (req, res) => {
  try {
    const { studentIds } = req.body;
    const result = await enqueueAnalytics({ studentIds }, req.user.id);
    res.status(202).json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const listQueueNames = (_req, res) => {
  res.json({ success: true, data: Object.values(QUEUE_NAMES) });
};
