import express from "express";
import { authenticate, restrictTo } from "../middlewares/auth.middleware.js";
import { recordView, getTrackingStats, resetTracking } from "../controllers/tracking.controller.js";

const router = express.Router();

router.post("/view", authenticate, recordView);

router.get("/stats", authenticate, restrictTo("hod", "admin"), getTrackingStats);

router.post("/reset", authenticate, restrictTo("hod", "admin"), resetTracking);

export default router;
