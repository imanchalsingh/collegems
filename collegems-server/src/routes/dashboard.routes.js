import express from "express";
   import { protect } from "../middlewares/auth.middleware.js";
   import { getDashboardData, getSemesterComparison } from "../controllers/dashboard.controller.js";

   const router = express.Router();

   router.get("/", protect, getDashboardData);
   router.get("/semester-comparison", protect, getSemesterComparison);

   export default router;