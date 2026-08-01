import express from "express";
import {
  getRecordSnapshots,
  getSnapshotDiff,
  searchSnapshots,
  restoreSnapshot,
} from "../controllers/snapshot.controller.js";
import { protect, restrictTo } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.use(protect);
router.use(restrictTo("admin", "hod"));

// Static paths before parameterized ones
router.get("/search", searchSnapshots);
router.get("/:id/diff", getSnapshotDiff);
router.post("/:id/restore", restoreSnapshot);
router.get("/:modelName/:recordId", getRecordSnapshots);

export default router;
