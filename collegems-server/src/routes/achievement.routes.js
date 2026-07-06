import express from "express";
import { protect } from "../middlewares/auth.middleware.js";
import { allowRoles } from "../middlewares/role.middleware.js";
import {
  submitAchievement,
  getTeacherAchievements,
  getAllAchievements,
  getAchievementById,
  approveAchievement,
  rejectAchievement,
  updateAchievement,
  deleteAchievement,
} from "../controllers/achievement.controller.js";

const router = express.Router();

// Teacher routes
router.post(
  "/submit",
  protect,
  allowRoles("teacher"),
  submitAchievement
);

router.get(
  "/my-achievements",
  protect,
  allowRoles("teacher"),
  getTeacherAchievements
);

router.put(
  "/:id",
  protect,
  allowRoles("teacher"),
  updateAchievement
);

router.delete(
  "/:id",
  protect,
  allowRoles("teacher"),
  deleteAchievement
);

// HOD/Admin routes
router.get(
  "/",
  protect,
  allowRoles("hod"),
  getAllAchievements
);

router.get(
  "/:id",
  protect,
  getAchievementById
);

router.put(
  "/:id/approve",
  protect,
  allowRoles("hod"),
  approveAchievement
);

router.put(
  "/:id/reject",
  protect,
  allowRoles("hod"),
  rejectAchievement
);

export default router;
