import express from "express";
import { authenticate } from "../middlewares/auth.middleware.js";
import { getAlumni, seedAlumni, updateAlumniProfile } from "../controllers/alumni.controller.js";
import { authorize } from "../middlewares/role.middleware.js";

const router = express.Router();

router.use(authenticate);

router.get("/", getAlumni);
router.put("/me", authorize("alumni"), updateAlumniProfile);
if (process.env.NODE_ENV !== "production") {
  router.post("/seed", authorize("admin", "hod"), seedAlumni);
}

export default router;
