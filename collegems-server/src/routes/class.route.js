import express from "express";
import { protect } from "../middlewares/auth.middleware.js";
import { allowRoles } from "../middlewares/role.middleware.js";
import { asyncHandler, AppError } from "../middlewares/errorHandler.middleware.js";
import log from "../utils/logger.js";
import Class from "../models/Classes.model.js";

const router = express.Router();

// Add class
router.post(
  "/add",
  protect,
  allowRoles("hod", "admin", "teacher"),
  asyncHandler(async (req, res) => {
    const { courseName, name, semester, schedule, teacher, room } = req.body;

    log.request("POST", "/api/classes/add", req.user?.id);

    if (!courseName || !name || !semester || !schedule || !teacher) {
      throw new AppError("All fields are required", 400, "MISSING_FIELDS");
    }

    const existing = await Class.findOne({ name });
    if (existing) {
      throw new AppError("Class already exists", 409, "DUPLICATE_CLASS");
    }

    const classes = await Class.create({
      courseName,
      name,
      semester,
      schedule,
      teacher,
      room,
    });

    log.info(`Class created: ${name}`, { classId: classes._id });
    res.status(201).json({ success: true, data: classes });
  })
);

// Update class
router.put(
  "/update/:id",
  protect,
  allowRoles("hod", "admin", "teacher"),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { courseName, name, semester, schedule, teacher, room } = req.body;

    log.request("PUT", `/api/classes/update/${id}`, req.user?.id);

    if (!id) {
      throw new AppError("Class ID is required", 400, "MISSING_ID");
    }

    const classes = await Class.findByIdAndUpdate(
      id,
      { courseName, name, semester, schedule, teacher, room },
      { new: true, runValidators: true }
    );

    if (!classes) {
      throw new AppError("Class not found", 404, "NOT_FOUND");
    }

    log.info(`Class updated: ${name}`, { classId: id });
    res.json({ success: true, data: classes });
  })
);

// Delete class
router.delete(
  "/delete/:id",
  protect,
  allowRoles("hod", "admin", "teacher"),
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    log.request("DELETE", `/api/classes/delete/${id}`, req.user?.id);

    if (!id) {
      throw new AppError("Class ID is required", 400, "MISSING_ID");
    }

    const classes = await Class.findByIdAndDelete(id);
    if (!classes) {
      throw new AppError("Class not found", 404, "NOT_FOUND");
    }

    log.info(`Class deleted: ${classes.name}`, { classId: id });
    res.json({ success: true, message: "Class deleted successfully" });
  })
);

// View all classes
router.get(
  "/all",
  protect,
  allowRoles("hod", "admin", "teacher", "student"),
  asyncHandler(async (req, res) => {
    log.request("GET", "/api/classes/all", req.user?.id);
    const classes = await Class.find()
      .populate("teacher", "name email")
      .populate("courseName", "name");
    res.json({ success: true, data: classes });
  })
);

export default router;
