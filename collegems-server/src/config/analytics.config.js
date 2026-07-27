/**
 * Analytics Module Configuration
 * Centralized configuration for analytics functionality
 */

export default {
  // Default query parameters
  DEFAULTS: {
    DAYS: 30,
    LIMIT: 20,
    ROLE: 'admin',
    PAGE: 1
  },
  
  // HTTP Status Codes
  HTTP_STATUS: {
    OK: 200,
    CREATED: 201,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    INTERNAL_SERVER_ERROR: 500
  },
  
  // Error Codes
  ERROR_CODES: {
    INTERNAL_ERROR: 'INTERNAL_ERROR',
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    NOT_FOUND: 'NOT_FOUND',
    UNAUTHORIZED: 'UNAUTHORIZED',
    FORBIDDEN: 'FORBIDDEN'
  },
  
  // Error Messages
  ERROR_MESSAGES: {
    TRACK_VISIT_FAILED: 'Failed to track visit',
    GET_METRICS_FAILED: 'Failed to get metrics',
    GET_ROLE_STATS_FAILED: 'Failed to get role statistics',
    GET_USER_STATS_FAILED: 'Failed to get user statistics',
    INVALID_DATE_RANGE: 'Invalid date range provided',
    INVALID_ROLE: 'Invalid role specified',
    UNAUTHORIZED_ACCESS: 'Unauthorized access',
    FORBIDDEN_ACCESS: 'Forbidden access'
  },
  
  // Analytics specific settings
  ANALYTICS: {
    MAX_DAYS_RANGE: 365,
    MIN_DAYS_RANGE: 1,
    MAX_LIMIT: 100,
    CACHE_TTL: 300, // 5 minutes in seconds
    ALLOWED_ROLES: ['admin', 'moderator', 'user', 'guest']
  },
  
  // Aggregation settings
  AGGREGATION: {
    MAX_BUCKETS: 1000,
    DEFAULT_INTERVAL: 'day',
    INTERVALS: ['hour', 'day', 'week', 'month', 'year']
  }
};