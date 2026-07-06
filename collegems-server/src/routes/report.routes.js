import express from "express";
import { protect } from "../middlewares/auth.middleware.js";
import { allowRoles } from "../middlewares/role.middleware.js";
import { getFilterOptions, generateReport } from "../controllers/report.controller.js";

const router = express.Router();

router.get("/filters", protect, allowRoles("hod"), getFilterOptions);
router.get("/generate", protect, allowRoles("hod"), generateReport);

export default router;
