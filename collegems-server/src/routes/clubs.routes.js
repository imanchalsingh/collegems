import express from "express";
import { protect } from "../middlewares/auth.middleware.js";
import { allowRoles } from "../middlewares/role.middleware.js";
import {
  createClub,
  getAllClubs,
  getClubById,
  getMyClubs,
  updateClub,
  deleteClub,
  requestToJoin,
  getPendingRequests,
  approveRequest,
  rejectRequest,
  removeMember,
  updateMemberRole,
  linkEventToClub,
  unlinkEventFromClub,
  getClubEvents,
  addAnnouncement, 
  deleteAnnouncement,
} from "../controllers/clubs.controller.js";

const router = express.Router();

// ── General (any authenticated user: student, teacher, hod) ──────────────────
router.post("/", protect, allowRoles("student", "teacher", "hod"), createClub);
router.get("/", protect, allowRoles("student", "teacher", "hod"), getAllClubs);
router.get("/my", protect, allowRoles("student", "teacher", "hod"), getMyClubs);
router.get("/:id", protect, allowRoles("student", "teacher", "hod"), getClubById);

router.put("/:id", protect, allowRoles("student", "teacher", "hod"), updateClub);
router.delete("/:id", protect, allowRoles("student", "teacher", "hod"), deleteClub);

// ── Membership ─────────────────────────────────────────────────────────────────
router.post("/:id/join", protect, allowRoles("student", "teacher", "hod"), requestToJoin);
router.get("/:id/requests", protect, allowRoles("student", "teacher", "hod"), getPendingRequests);
router.post("/:id/requests/:userId/approve", protect, allowRoles("student", "teacher", "hod"), approveRequest);
router.post("/:id/requests/:userId/reject", protect, allowRoles("student", "teacher", "hod"), rejectRequest);
router.delete("/:id/members/:userId", protect, allowRoles("student", "teacher", "hod"), removeMember);
router.put("/:id/members/:userId/role", protect, allowRoles("student", "teacher", "hod"), updateMemberRole);

// ── Events ──────────────────────────────────────────────────────────────────────
router.get("/:id/events", protect, allowRoles("student", "teacher", "hod"), getClubEvents);
router.post("/:id/events", protect, allowRoles("student", "teacher", "hod"), linkEventToClub);
router.delete("/:id/events/:eventId", protect, allowRoles("student", "teacher", "hod"), unlinkEventFromClub);

// ── Announcements ──────────────────────────────────────────────────────────────────
router.post("/:id/announcements", protect, allowRoles("student", "teacher", "hod"), addAnnouncement);
router.delete("/:id/announcements/:announcementId", protect, allowRoles("student", "teacher", "hod"), deleteAnnouncement);

export default router;