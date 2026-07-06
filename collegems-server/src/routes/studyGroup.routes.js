import express from "express";
import {
  createStudyGroup,
  getStudyGroups,
  joinStudyGroup,
  getChatHistory,
  saveDocumentVersion,
  getDocumentVersions,
  restoreDocumentVersion
} from "../controllers/studyGroup.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";

const router = express.Router();

// Apply auth middleware to all routes
router.use(authenticate);

router.post("/", createStudyGroup);
router.get("/", getStudyGroups);
router.post("/:id/join", joinStudyGroup);
router.get("/:id/messages", getChatHistory);

// Document Version History routes
router.post("/:id/versions", saveDocumentVersion);
router.get("/:id/versions", getDocumentVersions);
router.post("/:id/versions/:versionId/restore", restoreDocumentVersion);

export default router;
