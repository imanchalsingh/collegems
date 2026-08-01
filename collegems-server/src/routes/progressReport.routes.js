import express from "express";
import { allowRoles } from "../middlewares/role.middleware.js";
import {
  getStudentProgressReport,
  listProgressReportStudents,
} from "../controllers/progressReport.controller.js";

const router = express.Router();

router.get(
  "/students",
  allowRoles("teacher", "hod", "admin"),
  listProgressReportStudents
);

router.get(
  "/:studentId",
  allowRoles("teacher", "hod", "admin"),
  getStudentProgressReport
);

export default router;
