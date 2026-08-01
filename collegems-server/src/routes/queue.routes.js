import express from "express";
import { protect, restrictTo } from "../middlewares/auth.middleware.js";
import {
  getDashboard,
  getJob,
  enqueueEmailJob,
  enqueueReportJob,
  enqueueAnalyticsJob,
  listQueueNames,
} from "../controllers/queue.controller.js";

const router = express.Router();

router.use(protect);
router.use(restrictTo("admin", "hod"));

router.get("/names", listQueueNames);
router.get("/dashboard", getDashboard);
router.get("/:queueName/jobs/:jobId", getJob);

router.post("/email", enqueueEmailJob);
router.post("/reports", enqueueReportJob);
router.post("/analytics", enqueueAnalyticsJob);

export default router;
