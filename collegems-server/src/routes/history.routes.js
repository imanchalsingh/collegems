import express from "express";
import { authenticate } from "../middlewares/auth.middleware.js";
import { getHistory, addHistoryEntry } from "../controllers/history.controller.js";

const router = express.Router();

router.use(authenticate);

router.get("/", getHistory);
router.post("/", addHistoryEntry);

export default router;
