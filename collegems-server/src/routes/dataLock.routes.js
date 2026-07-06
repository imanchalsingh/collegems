import express from "express";
import { protect, restrictTo } from "../middlewares/auth.middleware.js";
import {
  createLockWindow,
  getLockWindows,
  updateLockWindow,
  deleteLockWindow,
} from "../controllers/dataLock.controller.js";

const router = express.Router();

router.use(protect);
router.use(restrictTo("hod", "admin"));

router.route("/")
  .post(createLockWindow)
  .get(getLockWindows);

router.route("/:id")
  .put(updateLockWindow)
  .delete(deleteLockWindow);

export default router;
