import express from "express";
import { authenticate } from "../middlewares/auth.middleware.js";
import {
  getAlumni,
  seedAlumni,
  updateAlumniProfile,
  requestAlumniMentorship,
} from "../controllers/alumni.controller.js";
import {
  createDonationCheckout,
  confirmDonationPayment,
  getMyDonations,
  getDonationStats,
} from "../controllers/alumniDonation.controller.js";
import { authorize } from "../middlewares/role.middleware.js";

const router = express.Router();

router.use(authenticate);

router.get("/", getAlumni);
router.put("/me", authorize("alumni"), updateAlumniProfile);

router.post(
  "/donations/checkout",
  authorize("alumni", "student", "teacher", "hod", "admin"),
  createDonationCheckout
);
router.post(
  "/donations/confirm",
  authorize("alumni", "student", "teacher", "hod", "admin"),
  confirmDonationPayment
);
router.get(
  "/donations/me",
  authorize("alumni", "student", "teacher", "hod", "admin"),
  getMyDonations
);
router.get(
  "/donations/stats",
  authorize("alumni", "hod", "admin"),
  getDonationStats
);

router.post(
  "/:alumniId/mentorship-request",
  authorize("student"),
  requestAlumniMentorship
);

if (process.env.NODE_ENV !== "production") {
  router.post("/seed", authorize("admin", "hod"), seedAlumni);
}

export default router;
