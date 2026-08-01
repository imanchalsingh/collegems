import express from "express";
import {
  generateWithGeneticAlgorithm,
  exportTimetableIcal,
} from "../controllers/timetableGenerator.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { allowRoles } from "../middlewares/role.middleware.js";

const router = express.Router();

router.use(authenticate);
router.use(allowRoles("hod", "admin", "teacher"));

router.post("/generate", generateWithGeneticAlgorithm);
router.post("/export/ics", exportTimetableIcal);

export default router;
