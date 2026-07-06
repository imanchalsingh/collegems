import DataLockWindow from "../models/DataLockWindow.model.js";

/**
 * Middleware to check if an academic data lock is active for a specific module.
 * If a lock is active, modifications (POST, PUT, PATCH, DELETE) are blocked for non-HOD users.
 * 
 * @param {String} moduleName The name of the module to check (e.g., 'results', 'attendance')
 */
export const checkDataLock = (moduleName) => {
  return async (req, res, next) => {
    try {
      // Only check modifying requests
      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
        
        // HODs and Admins can bypass locks
        if (req.user && (req.user.role === 'hod' || req.user.role === 'admin')) {
          return next();
        }

        const now = new Date();
        const activeLock = await DataLockWindow.findOne({
          isActive: true,
          $or: [{ affectedModules: moduleName }, { affectedModules: "all" }],
          startTime: { $lte: now },
          endTime: { $gte: now }
        });

        if (activeLock) {
          return res.status(403).json({
            success: false,
            message: `Modifications are currently disabled due to an active lock period: ${activeLock.name}`,
            isLocked: true,
            lockDetails: {
              name: activeLock.name,
              startTime: activeLock.startTime,
              endTime: activeLock.endTime
            }
          });
        }
      }
      next();
    } catch (error) {
      console.error(`Data Lock Error: ${error.message}`);
      next(error);
    }
  };
};
