import express from "express";
import { protect } from "../middlewares/auth.middleware.js";
import { allowRoles } from "../middlewares/role.middleware.js";
import { asyncHandler, AppError } from "../middlewares/errorHandler.middleware.js";
import log from "../utils/logger.js";
import Course from "../models/Course.model.js";
import { cacheResponse, invalidateCache } from "../middlewares/cache.middleware.js";
import { auditAction } from "../middlewares/audit.middleware.js";

const router = express.Router();

// HOD/Admin adds course
router.post(
  "/add",
  protect,
  allowRoles("hod", "admin", "teacher"),
  auditAction("CREATE_COURSE", "Course"),
  asyncHandler(async (req, res) => {
    const { name, code, department, semester, credits, description, maxStudents } = req.body;
    const teacher = req.body.teacher || req.user.id;

    log.request("POST", "/api/courses/add", req.user?.id);

    if (!name || !code || !department || !semester) {
      throw new AppError("All fields are required", 400, "MISSING_FIELDS");
    }

    const existing = await Course.findOne({ code });
    if (existing) {
      throw new AppError("Course already exists", 409, "DUPLICATE_COURSE");
    }

    const course = await Course.create({
      name,
      code,
      department,
      semester,
      teacher,
      credits,
      description,
      maxStudents,
    });

    log.info(`Course created: ${code}`, { courseId: course._id, teacher });
    invalidateCache('/api/courses'); // Clear course cache
    res.status(201).json({ success: true, data: course });
  })
);

// Update course
router.put(
  "/update/:id",
  protect,
  allowRoles("hod", "admin", "teacher"),
  auditAction("UPDATE_COURSE", "Course"),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { name, code, department, semester, teacher, credits, description, maxStudents } = req.body;

    log.request("PUT", `/api/courses/update/${id}`, req.user?.id);

    if (!id) {
      throw new AppError("Course ID is required", 400, "MISSING_ID");
    }

    const course = await Course.findByIdAndUpdate(
      id,
      { name, code, department, semester, teacher, credits, description, maxStudents },
      { new: true, runValidators: true }
    );

    if (!course) {
      throw new AppError("Course not found", 404, "NOT_FOUND");
    }

    log.info(`Course updated: ${code}`, { courseId: id });
    invalidateCache('/api/courses'); // Clear course cache
    res.json({ success: true, data: course });
  })
);

// Delete course
router.delete(
  "/delete/:id",
  protect,
  allowRoles("hod", "admin", "teacher"),
  auditAction("DELETE_COURSE", "Course"),
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    log.request("DELETE", `/api/courses/delete/${id}`, req.user?.id);

    if (!id) {
      throw new AppError("Course ID is required", 400, "MISSING_ID");
    }

    const course = await Course.findByIdAndUpdate(id, { isDeleted: true, deletedAt: new Date() });
    if (!course) {
      throw new AppError("Course not found", 404, "NOT_FOUND");
    }

log.info(`Course deleted: ${course.code}`, { courseId: id });
invalidateCache('/api/courses'); // Clear course cache
    res.json({ success: true, message: "Course deleted successfully" });
  })
);

router.get(
  "/all",
  protect,
  allowRoles("hod", "admin", "teacher", "student", "parent"),
  asyncHandler(async (req, res) => {
    const courses = await Course.find().populate("teacher", "name email");
    res.json(courses);
  })
);

// View soft-deleted courses
router.get(
  "/deleted",
  protect,
  allowRoles("hod", "admin"),
  asyncHandler(async (req, res) => {
    const courses = await Course.find({ isDeleted: true })
      .setOptions({ includeDeleted: true })
      .populate("teacher", "name email");
    res.json({ success: true, data: courses });
  })
);

// Restore a soft-deleted course
router.put(
  "/restore/:id",
  protect,
  allowRoles("hod", "admin"),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    if (!id) {
      throw new AppError("Course ID is required", 400, "MISSING_ID");
    }

    const course = await Course.findByIdAndUpdate(
      id,
      { isDeleted: false, deletedAt: null },
      { new: true }
    ).setOptions({ includeDeleted: true });

    if (!course) {
      throw new AppError("Course not found", 404, "NOT_FOUND");
    }

    log.info(`Course restored: ${course.code}`, { courseId: id });
    res.json({ success: true, message: "Course restored successfully", data: course });
  })
);

export default router;
