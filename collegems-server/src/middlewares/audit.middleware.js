import AuditLog from "../models/AuditLog.model.js";

export const auditAction = (actionName, moduleName) => {
  return (req, res, next) => {
    // Overwrite res.json to intercept the response
    const originalJson = res.json;
    res.json = function (body) {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        try {
          // Identify target from params, body, or response body
          let target = req.params.id || req.body._id || req.body.id || req.body.targetId || req.body.userId || 'N/A';
          if (body && typeof body === 'object') {
            if (body.data && body.data._id) {
              target = body.data._id;
            } else if (body._id) {
              target = body._id;
            }
          }

          // Sanitize sensitive fields from body
          const safeBody = { ...req.body };
          delete safeBody.password;
          delete safeBody.newPassword;
          delete safeBody.confirmPassword;

          const logEntry = new AuditLog({
            user: req.user ? (req.user.id || req.user._id) : null,
            action: actionName,
            module: moduleName,
            target: String(target),
            details: {
              method: req.method,
              url: req.originalUrl,
              body: safeBody,
              params: req.params,
              query: req.query,
            }
          });
          
          // Save async without blocking the response
          logEntry.save().catch(err => console.error("Audit log save error:", err));
        } catch (err) {
          console.error("Audit logging error:", err);
        }
      }
      return originalJson.call(this, body);
    };
    next();
  };
};
