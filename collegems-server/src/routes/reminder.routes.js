import express from "express";
import { getPendingUsers, queueReminders } from "../controllers/reminder.controller.js";
import { protect } from "../middlewares/auth.middleware.js";
import { authorize } from "../middlewares/role.middleware.js";

const router = express.Router();

// Only admins or HODs should be able to manage this
router.get("/pending-users", protect, authorize("admin", "hod"), getPendingUsers);
router.post("/queue", protect, authorize("admin", "hod"), queueReminders);

export default router;