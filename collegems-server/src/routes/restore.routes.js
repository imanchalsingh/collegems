import express from "express";
import {
  getSupportedModels,
  getArchivedRecords,
  getArchivedRecordDetails,
  validateRestoration,
  restoreRecord,
} from "../controllers/restore.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { authorize } from "../middlewares/role.middleware.js";

const router = express.Router();

// All restore operations require authentication and admin/hod role
router.use(authenticate);
router.use(authorize("admin", "hod"));

router.get("/models", getSupportedModels);
router.get("/:modelName", getArchivedRecords);
router.get("/:modelName/:id", getArchivedRecordDetails);
router.get("/:modelName/:id/validate", validateRestoration);
router.post("/:modelName/:id", restoreRecord);

export default router;
