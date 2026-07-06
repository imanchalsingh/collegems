import express from "express";
import { getRecordSnapshots, restoreSnapshot } from "../controllers/snapshot.controller.js";
import { protect, restrictTo } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.use(protect);
router.use(restrictTo("admin", "hod"));

router.get("/:modelName/:recordId", getRecordSnapshots);
router.post("/:id/restore", restoreSnapshot);

export default router;
