import express from "express";
import { protect } from "../middlewares/auth.middleware.js";
import { allowRoles } from "../middlewares/role.middleware.js";
import {
  markAttendance,
  getMyAttendance
} from "../controllers/attendance.controller.js";

const router = express.Router();

router.post(
  "/mark",
  protect,
  allowRoles("teacher"),
  markAttendance
);

router.get(
  "/me",
  protect,
  allowRoles("student"),
  getMyAttendance
);

export default router;
