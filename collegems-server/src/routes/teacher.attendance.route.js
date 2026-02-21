import express from "express";
import { protect } from "../middlewares/auth.middleware.js";
import { allowRoles } from "../middlewares/role.middleware.js";
import {
  markTeacherAttendance,
} from "../controllers/teacher.attendance.controller.js";

const router = express.Router();

router.post("/mark", protect, allowRoles("teacher"), markTeacherAttendance);


export default router;
