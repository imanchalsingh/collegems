import express from "express";
import { protect } from "../middlewares/auth.middleware.js";
import { allowRoles } from "../middlewares/role.middleware.js";
import {
  createHall,
  getHalls,
  updateHall,
  deleteHall,
} from "../controllers/hallAllocation.controller.js";

const router = express.Router();

router.post("/", protect, allowRoles("hod"), createHall);
router.get("/", protect, allowRoles("hod", "teacher"), getHalls);
router.put("/:id", protect, allowRoles("hod"), updateHall);
router.delete("/:id", protect, allowRoles("hod"), deleteHall);

export default router;
