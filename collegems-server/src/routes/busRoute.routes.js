import express from "express";
import { allowRoles } from "../middlewares/role.middleware.js";
import {
  getAllBusRoutes,
  getBusRouteById,
  createBusRoute,
  updateBusRoute,
  deleteBusRoute,
  publishTelemetry,
  getLatestTelemetry,
  getTelemetryHistory,
  simulateTelemetry,
} from "../controllers/busRoute.controller.js";

const router = express.Router();

router.get("/", getAllBusRoutes);

// Static telemetry paths before /:id
router.get("/:id/telemetry/latest", getLatestTelemetry);
router.get("/:id/telemetry/history", getTelemetryHistory);
router.post(
  "/:id/telemetry",
  allowRoles("hod", "admin", "teacher", "staff"),
  publishTelemetry
);
router.post(
  "/:id/telemetry/simulate",
  allowRoles("hod", "admin"),
  simulateTelemetry
);

router.get("/:id", getBusRouteById);
router.post("/", allowRoles("hod", "admin"), createBusRoute);
router.put("/:id", allowRoles("hod", "admin"), updateBusRoute);
router.delete("/:id", allowRoles("hod", "admin"), deleteBusRoute);

export default router;
