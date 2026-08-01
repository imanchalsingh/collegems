import httpContext from "express-http-context";

/**
 * Captures actor + request metadata for the field-level audit trail plugin.
 * Must run after authentication so req.user is available.
 */
export function captureAuditContext(req, _res, next) {
  try {
    const ip =
      req.headers["x-forwarded-for"]?.toString().split(",")[0]?.trim() ||
      req.ip ||
      req.socket?.remoteAddress ||
      null;

    httpContext.set("auditContext", {
      userId: req.user?.id || req.user?._id || null,
      role: req.user?.role || null,
      ipAddress: ip,
      userAgent: req.headers["user-agent"] || null,
    });
  } catch {
    // never block the request
  }
  next();
}
