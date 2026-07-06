import express from "express";
import {
  getAvailableResources,
  createBooking,
  getMyBookings,
  getAllBookings,
  updateBookingStatus,
  cancelBooking,
} from "../controllers/booking.controller.js";
import { authenticate, restrictTo } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.use(authenticate);

router.get("/available", getAvailableResources);
router.post("/", createBooking);
router.get("/my", getMyBookings);
router.get("/", restrictTo("hod"), getAllBookings);
router.put("/:id/status", restrictTo("hod"), updateBookingStatus);
router.put("/:id/cancel", cancelBooking);

export default router;
