import express from "express";
import { protect, restrictTo } from "../middlewares/auth.middleware.js";
import {
  getRateLimitMetrics,
  unbanIpAddress,
} from "../controllers/securityMetrics.controller.js";

const router = express.Router();

router.get("/", protect, restrictTo("hod", "admin"), getRateLimitMetrics);
router.post("/unban", protect, restrictTo("hod", "admin"), unbanIpAddress);

export default router;
