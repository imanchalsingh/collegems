import express from "express";
import {
  generateLink,
  accessLink,
  revokeLink,
  getMyLinks
} from "../controllers/temporaryLink.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";

const router = express.Router();

// Public route to access link
router.get("/access/:token", accessLink);

// Protected routes
router.use(authenticate);
router.post("/", generateLink);
router.get("/my-links", getMyLinks);
router.put("/:token/revoke", revokeLink);

export default router;
