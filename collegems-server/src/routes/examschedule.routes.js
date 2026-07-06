import express from "express";
import { protect } from "../middlewares/auth.middleware.js";
import { allowRoles } from "../middlewares/role.middleware.js";
import { asyncHandler, AppError } from "../middlewares/errorHandler.middleware.js";
import log from "../utils/logger.js";
import ExamSchedule from "../models/ExamSchedule.model.js";
import { checkScheduleConflicts } from "../services/calendarValidation.service.js";

const router = express.Router();

// Create exam schedule
router.post(
  "/add",
  protect,
  allowRoles("hod", "admin", "teacher"),
  asyncHandler(async (req, res) => {
    const {
      examName,
      course,
      examDate,
      startTime,
      endTime,
      location,
      venue,
    } = req.body;

    log.request("POST", "/api/examschedule/add", req.user?.id);

    if (
      !examName ||
      !course ||
      !examDate ||
      !startTime ||
      !endTime ||
      !location ||
      !venue
    ) {
      throw new AppError("All fields are required", 400, "MISSING_FIELDS");
    }

    const validation = await checkScheduleConflicts({
      date: examDate,
      startTime,
      endTime
    });

    if (validation.hasConflict) {
      throw new AppError(
        validation.conflictMessage,
        409,
        "SCHEDULE_CONFLICT"
      );
    }

    const examSchedule = await ExamSchedule.create({
      examName,
      course,
      examDate,
      startTime,
      endTime,
      location,
      venue,
    });

    log.info(`Exam schedule created: ${examName}`, { scheduleId: examSchedule._id });
    res.status(201).json({ success: true, data: examSchedule });
  })
);

// Update exam schedule
router.put(
  "/update/:id",
  protect,
  allowRoles("hod", "admin", "teacher"),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const {
      examName,
      course,
      examDate,
      startTime,
      endTime,
      location,
      venue,
    } = req.body;

    log.request("PUT", `/api/examschedule/update/${id}`, req.user?.id);

    if (!id) {
      throw new AppError("Schedule ID is required", 400, "MISSING_ID");
    }

    const validation = await checkScheduleConflicts({
      date: examDate,
      startTime,
      endTime,
      excludeId: id
    });

    if (validation.hasConflict) {
      throw new AppError(
        validation.conflictMessage,
        409,
        "SCHEDULE_CONFLICT"
      );
    }

    const examSchedule = await ExamSchedule.findByIdAndUpdate(
      id,
      { examName, course, examDate, startTime, endTime, location, venue },
      { new: true, runValidators: true }
    );

    if (!examSchedule) {
      throw new AppError("Exam schedule not found", 404, "NOT_FOUND");
    }

    log.info(`Exam schedule updated: ${examName}`, { scheduleId: id });
    res.json({ success: true, data: examSchedule });
  })
);

// Delete exam schedule
router.delete(
  "/delete/:id",
  protect,
  allowRoles("hod", "admin", "teacher"),
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    log.request("DELETE", `/api/examschedule/delete/${id}`, req.user?.id);

    if (!id) {
      throw new AppError("Schedule ID is required", 400, "MISSING_ID");
    }

    const examSchedule = await ExamSchedule.findByIdAndDelete(id);
    if (!examSchedule) {
      throw new AppError("Exam schedule not found", 404, "NOT_FOUND");
    }

    log.info(`Exam schedule deleted: ${examSchedule.examName}`, { scheduleId: id });
    res.json({ success: true, message: "Exam schedule deleted successfully" });
  })
);

router.get(
  "/all",
  protect,
  allowRoles("student", "teacher", "admin", "hod", "parent"),
  asyncHandler(async (req, res) => {
    const examSchedule = await ExamSchedule.find({});
    res.json({ success: true, data: examSchedule });
  })
);

export default router;
