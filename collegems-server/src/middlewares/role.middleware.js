// collegems-server/src/middlewares/role.middleware.js

export const authorize = (...allowedRoles) => {
  // Validate input - Check if roles are provided
  if (!allowedRoles || allowedRoles.length === 0) {
    throw new Error('At least one role must be specified for authorization');
  }

  // Filter out invalid roles (non-string, empty, null, undefined)
  const validRoles = allowedRoles
    .filter(role => role && typeof role === 'string' && role.trim().length > 0)
    .map(role => role.toLowerCase().trim());

  // Check if any valid roles remain after filtering
  if (validRoles.length === 0) {
    throw new Error('Invalid roles provided for authorization. Roles must be non-empty strings');
  }

  // Remove duplicate roles
  const uniqueRoles = [...new Set(validRoles)];

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized - User payload missing",
        error: "AUTH_USER_MISSING"
      });
    }

    if (!req.user.role) {
      return res.status(403).json({
        success: false,
        message: "Forbidden - User role not found",
        error: "AUTH_ROLE_MISSING"
      });
    }

    const userRole = req.user.role.toLowerCase().trim();

    if (!uniqueRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden - Required roles: ${uniqueRoles.join(', ')}`,
        error: "AUTH_INSUFFICIENT_PERMISSIONS",
        requiredRoles: uniqueRoles,
        userRole: userRole
      });
    }

    req.allowedRoles = uniqueRoles;
    next();
  };
};

export const allowRoles = authorize;