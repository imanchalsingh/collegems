import express from "express";
import { getSystemHealth } from "../controllers/systemHealth.controller.js";
import { protect, restrictTo } from "../middlewares/auth.middleware.js";

const router = express.Router();

// Restrict system health endpoint to HOD and Admin roles
router.get("/", protect, restrictTo("hod", "admin"), getSystemHealth);

export default router;
