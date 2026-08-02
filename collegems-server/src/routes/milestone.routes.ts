import express from "express";
import { authenticate } from "../middlewares/auth.middleware.js";
import { getMilestones } from "../controllers/milestone.controller.js";

const router = express.Router();

router.get("/student/milestones", authenticate, getMilestones as any);

export default router;
