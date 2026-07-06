import express from "express";
import { allowRoles } from "../middlewares/role.middleware.js";
import {
  getAllBusRoutes,
  getBusRouteById,
  createBusRoute,
  updateBusRoute,
  deleteBusRoute,
} from "../controllers/busRoute.controller.js";

const router = express.Router();

// Get all routes - open to all authenticated roles (student, parent, teacher, hod, admin)
router.get("/", getAllBusRoutes);

// Get specific route - open to all authenticated roles
router.get("/:id", getBusRouteById);

// Create route - HOD and admin only
router.post("/", allowRoles("hod", "admin"), createBusRoute);

// Update route - HOD and admin only
router.put("/:id", allowRoles("hod", "admin"), updateBusRoute);

// Delete route - HOD and admin only
router.delete("/:id", allowRoles("hod", "admin"), deleteBusRoute);

export default router;
