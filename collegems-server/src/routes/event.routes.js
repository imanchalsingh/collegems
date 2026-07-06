import {
    createEvent,
    getAllEvents,
    getEventById,
    updateEvent,
    deleteEvent,
    generateEventQRCode,
    toggleQRCodeStatus,
    checkInEvent,
    getEventAttendance,
    markEventAsRead,
    markEventAsUnread,
    getReadCount,
    getReaders,
    getUnreadStudents,
} from "../controllers/events.controller.js";
import { protect } from "../middlewares/auth.middleware.js";
import { allowRoles } from "../middlewares/role.middleware.js";
import express from "express";


const router = express.Router();
router.get(
    "/:id/read-count",
    protect,
    allowRoles("hod", "teacher"),
    getReadCount
);

router.get(
    "/:id/readers",
    protect,
    allowRoles("hod", "teacher"),
    getReaders
);

router.get(
    "/:id/unreaders",
    protect,
    allowRoles("hod", "teacher"),
    getUnreadStudents
);
// PUBLIC ROUTES
router.get("/", getAllEvents);
router.get("/:id", getEventById);

// ADMIN ROUTES
router.post("/create", protect, allowRoles('hod', 'teacher'), createEvent);
router.put("/:id", protect, allowRoles('hod', 'teacher'), updateEvent);
router.delete("/:id", protect, allowRoles('hod', 'teacher'), deleteEvent);

// QR & ATTENDANCE ROUTES
router.post("/:id/generate-qr", protect, allowRoles('hod', 'teacher'), generateEventQRCode);
router.post("/:id/toggle-qr", protect, allowRoles('hod', 'teacher'), toggleQRCodeStatus);
router.get("/:id/attendance", protect, allowRoles('hod', 'teacher'), getEventAttendance);

// STUDENT / PARTICIPANT ROUTES
router.post("/check-in", protect, checkInEvent);

// READ/UNREAD ROUTES
router.post("/:id/read", protect, markEventAsRead);
router.post("/:id/unread", protect, markEventAsUnread);

export default router;
