import express from "express";
import { protect } from "../middlewares/auth.middleware.js";
import { allowRoles } from "../middlewares/role.middleware.js";
import {
  downloadMyIdCard,
  downloadStudentIdCard,
  getMyIdCardData,
  verifyStudent,
  verifyToken,
} from "../controllers/idcard.controller.js";

const router = express.Router();

router.get("/me/data", protect, allowRoles("student"), getMyIdCardData);
router.get("/me/card", protect, allowRoles("student"), downloadMyIdCard);
router.get(
  "/:studentId/card",
  protect,
  allowRoles("teacher", "hod"),
  downloadStudentIdCard,
);

export default router;
