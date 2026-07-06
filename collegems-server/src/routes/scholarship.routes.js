import express from "express";
import { protect } from "../middlewares/auth.middleware.js";
import { allowRoles } from "../middlewares/role.middleware.js";
import {
  applyScholarship,
  getMyScholarships,
  getAllScholarships,
  reviewScholarship,
  cancelScholarship,
} from "../controllers/scholarship.controller.js";

const router = express.Router();

// ── Student endpoints ───────────────────────────────────────────────
router.post(
  "/",
  protect,
  allowRoles("student"),
  applyScholarship
);

router.get(
  "/me",
  protect,
  allowRoles("student", "parent"),
  getMyScholarships
);

router.delete(
  "/:id",
  protect,
  allowRoles("student"),
  cancelScholarship
);

// ── HOD / Admin endpoints ───────────────────────────────────────────
router.get(
  "/all",
  protect,
  allowRoles("hod"),
  getAllScholarships
);

router.patch(
  "/:id/review",
  protect,
  allowRoles("hod"),
  reviewScholarship
);

export default router;
