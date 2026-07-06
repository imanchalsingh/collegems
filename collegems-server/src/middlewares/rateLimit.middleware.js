import rateLimit from "express-rate-limit";

//  Login limiter (strict)
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 5,
  message: {
    success: false,
    message: "Too many login attempts. Try again later.",
  },
});

//  Register limiter (moderate)
export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: {
    success: false,
    message: "Too many registrations. Try again later.",
  },
});