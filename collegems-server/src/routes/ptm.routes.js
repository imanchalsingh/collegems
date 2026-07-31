import express from "express";
import { authenticate } from "../middlewares/auth.middleware.js";
import { authorize } from "../middlewares/role.middleware.js";
import { sanitizeInput } from "../middlewares/sanitize.middleware.js";
import {
  listTeachersForParent,
  createPTMRequest,
  getMyPTMs,
  updatePTMStatus,
  updatePTMNotes,
  getPTMRoom,
} from "../controllers/ptm.controller.js";

const router = express.Router();

router.use(authenticate);

router.get("/teachers", authorize("parent"), listTeachersForParent);
router.get("/mine", authorize("parent", "teacher", "hod"), getMyPTMs);
router.post("/", authorize("parent"), sanitizeInput, createPTMRequest);
router.patch("/:id/status", authorize("parent", "teacher", "hod"), sanitizeInput, updatePTMStatus);
router.patch("/:id/notes", authorize("teacher", "hod"), sanitizeInput, updatePTMNotes);
router.get("/:id/room", authorize("parent", "teacher", "hod"), getPTMRoom);

export default router;
