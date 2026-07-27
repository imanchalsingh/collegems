import rateLimit from "express-rate-limit";

// Login limiter (strict) - Now using environment variables
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 5,
  skip: () => process.env.NODE_ENV === "test",
  message: {
    success: false,
    message: process.env.LOGIN_RATE_LIMIT_MESSAGE || "Too many login attempts. Try again later.",
  },
  skipSuccessfulRequests: process.env.LOGIN_SKIP_SUCCESS === 'true',
});

// Register limiter (moderate)
export const registerLimiter = rateLimit({
  windowMs: parseInt(process.env.REGISTER_WINDOW_MS) || 60 * 60 * 1000, // 1 hour default
  max: parseInt(process.env.REGISTER_MAX_ATTEMPTS) || 10,
  message: {
    success: false,
    message: process.env.REGISTER_RATE_LIMIT_MESSAGE || "Too many registrations. Try again later.",
  },
});

// Reset password limiter (strict)
export const resetPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 5,
  message: {
    success: false,
    message: "Too many password reset attempts. Try again later.",
  },
});

// OTP / verification limiter (moderate)
export const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 5,
  message: {
    success: false,
    message: "Too many verification requests. Try again later.",
  },
});

export const verifyEmailLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 5,
  skip: () => process.env.NODE_ENV === "test",
  message: {
    success: false,
    message: "Too many verification requests. Try again later.",
  },
});
