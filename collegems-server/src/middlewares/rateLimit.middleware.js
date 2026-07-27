import rateLimit from "express-rate-limit";

// Login limiter (strict) - Now using environment variables
export const loginLimiter = rateLimit({
  windowMs: parseInt(process.env.LOGIN_WINDOW_MS) || 15 * 60 * 1000, // 15 min default
  max: parseInt(process.env.LOGIN_MAX_ATTEMPTS) || 5,
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
