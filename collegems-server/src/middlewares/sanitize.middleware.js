import xss from 'xss';

/**
 * Reusable middleware to sanitize req.body, req.query, and req.params
 * using the 'xss' library to prevent Cross-Site Scripting (XSS).
 */
export const sanitizeInput = (req, res, next) => {
  const sanitizeObject = (obj) => {
    if (typeof obj === 'string') {
      return xss(obj.trim());
    }
    if (Array.isArray(obj)) {
      return obj.map((item) => sanitizeObject(item));
    }
    if (obj !== null && typeof obj === 'object') {
      const sanitized = {};
      for (const [key, value] of Object.entries(obj)) {
        sanitized[key] = sanitizeObject(value);
      }
      return sanitized;
    }
    return obj;
  };

  if (req.body) {
    req.body = sanitizeObject(req.body);
  }
  
  if (req.query) {
    for (const key of Object.keys(req.query)) {
      req.query[key] = sanitizeObject(req.query[key]);
    }
  }
  
  if (req.params) {
    for (const key of Object.keys(req.params)) {
      req.params[key] = sanitizeObject(req.params[key]);
    }
  }

  next();
};
