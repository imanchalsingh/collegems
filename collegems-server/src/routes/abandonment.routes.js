import express from "express";
import {
  startFormSession,
  updateFormSession,
  submitFormSession,
  getFormStats,
} from "../controllers/abandonment.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { authorize } from "../middlewares/role.middleware.js";

const router = express.Router();

router.post("/start", authenticate, startFormSession);
router.put("/update/:id", authenticate, updateFormSession);
router.put("/submit/:id", authenticate, submitFormSession);

// Admin / HOD access only for stats
router.get("/stats", authenticate, authorize("admin", "hod"), getFormStats);

export default router;
