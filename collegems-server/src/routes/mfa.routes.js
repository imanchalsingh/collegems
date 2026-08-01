import express from "express";
import {
  getMfaStatus,
  startMfaSetup,
  confirmMfaSetup,
  disableMfa,
  regenerateRecoveryCodes,
} from "../controllers/mfa.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { otpLimiter } from "../middlewares/rateLimit.middleware.js";

const router = express.Router();

router.use(authenticate);

router.get("/status", getMfaStatus);
router.post("/setup", otpLimiter, startMfaSetup);
router.post("/verify-setup", otpLimiter, confirmMfaSetup);
router.post("/disable", otpLimiter, disableMfa);
router.post("/recovery-codes", otpLimiter, regenerateRecoveryCodes);

export default router;
