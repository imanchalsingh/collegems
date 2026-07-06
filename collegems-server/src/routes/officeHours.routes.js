import express from "express";
import { protect } from "../middlewares/auth.middleware.js";
import { authorize } from "../middlewares/role.middleware.js";
import {
  getMyOfficeHours,
  setMyOfficeHours,
  getFacultyOfficeHours,
  getAllOfficeHours,
} from "../controllers/officeHours.controller.js";

const router = express.Router();

router.get("/my", protect, authorize("teacher", "hod"), getMyOfficeHours);
router.put("/my", protect, authorize("teacher", "hod"), setMyOfficeHours);
router.get("/all", getAllOfficeHours);
router.get("/faculty/:id", getFacultyOfficeHours);

export default router;
