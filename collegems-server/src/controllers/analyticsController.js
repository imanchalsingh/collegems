import PageVisit from "../models/PageVisit.js";
import analyticsConfig from "../config/analytics.config.js";

// ============================================
// DESTRUCTURE CONFIGURATION
// ============================================

const { DEFAULTS, HTTP_STATUS, ERROR_CODES, ERROR_MESSAGES, ANALYTICS } = analyticsConfig;

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Validate days parameter
 */
const validateDays = (days) => {
  let parsedDays = parseInt(days, 10) || DEFAULTS.DAYS;
  
  if (parsedDays < ANALYTICS.MIN_DAYS_RANGE) {
    parsedDays = ANALYTICS.MIN_DAYS_RANGE;
  }
  
  if (parsedDays > ANALYTICS.MAX_DAYS_RANGE) {
    parsedDays = ANALYTICS.MAX_DAYS_RANGE;
  }
  
  return parsedDays;
};

/**
 * Validate limit parameter
 */
const validateLimit = (limit) => {
  let parsedLimit = parseInt(limit, 10) || DEFAULTS.LIMIT;
  
  if (parsedLimit < 1) {
    parsedLimit = DEFAULTS.LIMIT;
  }
  
  if (parsedLimit > ANALYTICS.MAX_LIMIT) {
    parsedLimit = ANALYTICS.MAX_LIMIT;
  }
  
  return parsedLimit;
};

/**
 * Validate role
 */
const validateRole = (role) => {
  if (!role) return DEFAULTS.ROLE;
  
  const roleLower = role.toLowerCase().trim();
  if (ANALYTICS.ALLOWED_ROLES.includes(roleLower)) {
    return roleLower;
  }
  
  return DEFAULTS.ROLE;
};

/**
 * Get date limit based on days
 */
const getDateLimit = (days) => {
  const dateLimit = new Date();
  dateLimit.setDate(dateLimit.getDate() - days);
  return dateLimit;
};

// ============================================
// CONTROLLER FUNCTIONS
// ============================================

/**
 * Track page visit
 * POST /api/analytics/track
 */
export const trackPageVisit = async (req, res, next) => {
    try {
        const { page, role } = req.body;
        const userId = req.user?._id;

        // Validate role using config
        const validRole = validateRole(role);

        await PageVisit.create({
            page,
            user: userId,
            role: validRole,
            timestamp: new Date()
        });

        res.status(HTTP_STATUS.CREATED).json({ 
            success: true, 
            message: 'Visit tracked' 
        });
    } catch (error) {
        console.error('Track visit error:', error);
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
            error: {
                code: ERROR_CODES.INTERNAL_ERROR,
                message: ERROR_MESSAGES.TRACK_VISIT_FAILED
            }
        });
    }
};

/**
 * Get page visit metrics
 * GET /api/analytics/metrics
 */
export const getPageVisitMetrics = async (req, res) => {
    try {
        const { days = DEFAULTS.DAYS, limit = DEFAULTS.LIMIT } = req.query;

        // Validate days using config
        const validDays = validateDays(days);
        const validLimit = validateLimit(limit);

        const dateLimit = getDateLimit(validDays);

        // Aggregate visits by page
        const metrics = await PageVisit.aggregate([
            {
                $match: {
                    timestamp: { $gte: dateLimit }
                }
            },
            {
                $group: {
                    _id: '$page',
                    count: { $sum: 1 },
                    uniqueUsers: { $addToSet: '$user' }
                }
            },
            {
                $project: {
                    page: '$_id',
                    visits: '$count',
                    uniqueUsers: { $size: '$uniqueUsers' },
                    _id: 0
                }
            },
            { $sort: { visits: -1 } },
            { $limit: validLimit }
        ]);

        // Get total visits
        const totalVisits = await PageVisit.countDocuments({
            timestamp: { $gte: dateLimit }
        });

        res.status(HTTP_STATUS.OK).json({
            success: true,
            data: {
                metrics,
                summary: {
                    totalVisits,
                    uniquePages: metrics.length,
                    dateRange: `${validDays} days`
                }
            }
        });
    } catch (error) {
        console.error('Get metrics error:', error);
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
            error: {
                code: ERROR_CODES.INTERNAL_ERROR,
                message: ERROR_MESSAGES.GET_METRICS_FAILED
            }
        });
    }
};

/**
 * Get visits by role
 * GET /api/analytics/roles
 */
export const getVisitsByRole = async (req, res) => {
    try {
        const { days = DEFAULTS.DAYS } = req.query;

        // Validate days using config
        const validDays = validateDays(days);

        const dateLimit = getDateLimit(validDays);

        const roleStats = await PageVisit.aggregate([
            {
                $match: {
                    timestamp: { $gte: dateLimit },
                    role: { $ne: null }
                }
            },
            {
                $group: {
                    _id: '$role',
                    count: { $sum: 1 }
                }
            },
            {
                $project: {
                    role: '$_id',
                    visits: '$count',
                    _id: 0
                }
            },
            { $sort: { visits: -1 } }
        ]);

        res.status(HTTP_STATUS.OK).json({
            success: true,
            data: roleStats
        });
    } catch (error) {
        console.error('Get role stats error:', error);
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
            error: {
                code: ERROR_CODES.INTERNAL_ERROR,
                message: ERROR_MESSAGES.GET_ROLE_STATS_FAILED
            }
        });
    }
};