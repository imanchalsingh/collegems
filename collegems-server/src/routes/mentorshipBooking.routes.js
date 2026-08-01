import express from "express";
import { protect } from "../middlewares/auth.middleware.js";
import { allowRoles } from "../middlewares/role.middleware.js";
import { sanitizeInput } from "../middlewares/sanitize.middleware.js";
import {
  upsertMyAvailability,
  getMyAvailability,
  getAvailableSlots,
  createBooking,
  getMyBookings,
  cancelBooking,
  completeBooking,
  rateBooking,
  listMyMentorsForBooking,
} from "../controllers/mentorshipBooking.controller.js";

const router = express.Router();

router.use(protect);

router.get("/availability/my", allowRoles("teacher", "hod", "student"), getMyAvailability);
router.put(
  "/availability/my",
  allowRoles("teacher", "hod", "student"),
  sanitizeInput,
  upsertMyAvailability
);

router.get("/slots", allowRoles("student", "teacher", "hod"), getAvailableSlots);
router.get("/mentors", allowRoles("student"), listMyMentorsForBooking);

router.get("/my", allowRoles("student", "teacher", "hod"), getMyBookings);
router.post("/", allowRoles("student"), sanitizeInput, createBooking);
router.patch("/:id/cancel", allowRoles("student", "teacher", "hod"), cancelBooking);
router.patch("/:id/complete", allowRoles("teacher", "hod", "student"), completeBooking);
router.post("/:id/rating", allowRoles("student"), sanitizeInput, rateBooking);

export default router;
