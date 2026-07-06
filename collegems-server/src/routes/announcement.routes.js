// FILE: collegems-server/src/routes/announcement.routes.js

import express from "express";
import {
  createAnnouncement,
  getMyAnnouncements,
  getAllAnnouncements,
  getAnnouncementById,
  updateAnnouncement,
  deleteAnnouncement,
  markAnnouncementRead,
  getAnnouncementReadStats,
} from "../controllers/announcement.controller.js";
import { protect } from "../middlewares/auth.middleware.js";
import { allowRoles } from "../middlewares/role.middleware.js";

const router = express.Router();

// All routes require authentication
router.use(protect);

// Any logged-in user can fetch announcements targeted at them
router.get("/my", getMyAnnouncements);

// Admin views (hod + teacher can manage)
router.get(
  "/",
  allowRoles("hod", "teacher"),
  getAllAnnouncements
);

router.get("/:id", getAnnouncementById);

router.post("/:id/read", markAnnouncementRead);
router.get("/:id/read-stats", allowRoles("hod", "teacher"), getAnnouncementReadStats);

router.post(
  "/",
  allowRoles("hod", "teacher"),
  createAnnouncement
);

router.put(
  "/:id",
  allowRoles("hod", "teacher"),
  updateAnnouncement
);

router.delete(
  "/:id",
  allowRoles("hod", "teacher"),
  deleteAnnouncement
);

export default router;
