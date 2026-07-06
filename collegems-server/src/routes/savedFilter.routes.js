import express from "express";
import {
  getSavedFilters,
  createSavedFilter,
  deleteSavedFilter,
} from "../controllers/savedFilter.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.use(authenticate);

router.get("/:dashboard", getSavedFilters);
router.post("/", createSavedFilter);
router.delete("/:id", deleteSavedFilter);

export default router;
