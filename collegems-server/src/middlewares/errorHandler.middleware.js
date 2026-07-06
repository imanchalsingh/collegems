import log from "../utils/logger.js";

// Standardized error response format
const errorResponse = (statusCode, message, errorCode = null, details = null) => ({
  success: false,
  message,
  errorCode: errorCode || `ERR_${statusCode}`,
  details: details || null,
  timestamp: new Date().toISOString(),
});

// Global error handling middleware
export const errorHandler = (err, req, res, next) => {
  const userId = req.user?.id || "anonymous";
  const method = req.method;
  const path = req.originalUrl;

  // Log the error
  log.error(`${method} ${path}`, err, {
    userId,
    statusCode: err.statusCode || 500,
    userAgent: req.get("user-agent"),
  });

  // Handle different types of errors
  let statusCode = err.statusCode || 500;
  let message = err.message || "Internal server error";
  let errorCode = err.errorCode || null;
  let details = null;

  // MongoDB validation errors
  if (err.name === "ValidationError") {
    statusCode = 400;
    message = "Validation failed";
    errorCode = "VALIDATION_ERROR";
    details = Object.keys(err.errors).map((field) => ({
      field,
      message: err.errors[field].message,
    }));
  }

  // MongoDB duplicate key errors
  if (err.code === 11000) {
    statusCode = 409;
    message = "Duplicate entry";
    errorCode = "DUPLICATE_ERROR";
    const field = Object.keys(err.keyPattern)[0];
    details = { field, value: err.keyValue[field] };
  }

  // MongoDB cast errors
  if (err.name === "CastError") {
    statusCode = 400;
    message = `Invalid ${err.kind}: ${err.value}`;
    errorCode = "INVALID_ID";
  }

  // JWT errors
  if (err.name === "JsonWebTokenError") {
    statusCode = 401;
    message = "Invalid token";
    errorCode = "INVALID_TOKEN";
  }

  if (err.name === "TokenExpiredError") {
    statusCode = 401;
    message = "Token expired";
    errorCode = "TOKEN_EXPIRED";
  }

  // Send response
  res.status(statusCode).json(errorResponse(statusCode, message, errorCode, details));
};

// Async error wrapper for route handlers
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Custom error class
export class AppError extends Error {
  constructor(message, statusCode, errorCode = null) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
  }
}
