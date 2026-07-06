import express from "express";
import { analyze, repair } from "../controllers/sequence.controller.js";
import { protect, restrictTo } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.use(protect);
// Only administrators can perform sequence repair operations
router.use(restrictTo("admin", "hod"));

router.get("/analyze", analyze);
router.post("/repair", repair);

export default router;
