import express from "express";
import { globalSearch } from "../controllers/search.controller.js";
import { protect } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.get("/", protect, globalSearch);

export default router;
