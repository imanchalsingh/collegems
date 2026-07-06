import express from "express";
import { protect } from "../middlewares/auth.middleware.js";
import { authorize } from "../middlewares/role.middleware.js";
import {
  updateStudentTransfer,
  getTransferHistory,
} from "../controllers/transfer.controller.js";

const router = express.Router();

// HOD can update student transfer
router.put(
  "/students/:id/transfer",
  protect,
  authorize("hod"),
  updateStudentTransfer
);

// HOD and student can view transfer history
router.get(
  "/students/:id/transfer-history",
  protect,
  authorize("hod", "student"),
  getTransferHistory
);

export default router;