import express from "express";
import {
  register,
  login,
  refresh,
  logout,
  getSessions,
  logoutAll,
  deleteSession,
  verifyEmail,
  resendVerificationEmail,
  forgotPassword,
  resetPassword,
} from "../controllers/auth.controller.js";
import { validateRegister } from "../middlewares/validation.middleware.js";
import {
  loginLimiter,
  registerLimiter,
  resetPasswordLimiter,
  otpLimiter,
  verifyEmailLimiter,
} from "../middlewares/rateLimit.middleware.js";
import { publicAuthLimiter } from "../middlewares/dynamicRateLimiter.js";
import { detectDevice } from "../middlewares/session.middleware.js";
import { authenticate } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.use(publicAuthLimiter);

router.post("/register", registerLimiter, detectDevice, validateRegister, register);
router.post("/login", loginLimiter, detectDevice, login);
router.post("/refresh", detectDevice, refresh);
router.post("/logout", logout);
router.post("/verify-email", verifyEmailLimiter, verifyEmail);
router.post("/resend-verification", otpLimiter, resendVerificationEmail);
router.post("/forgot-password", resetPasswordLimiter, forgotPassword);
router.post("/reset-password", resetPasswordLimiter, resetPassword);

router.get("/sessions", authenticate, getSessions);
router.post("/logout-all", authenticate, logoutAll);
router.delete("/sessions/:id", authenticate, deleteSession);

export default router;