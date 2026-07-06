import { cache } from "../utils/cache.js";

/**
 * Middleware to cache Express API responses
 * @param {number} ttlSeconds - Time to live in seconds
 * @returns {Function} Express middleware function
 */
export const cacheResponse = (ttlSeconds = 60) => {
  return (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Build a unique cache key based on the URL
    // If you need role-based caching, you can append req.user?.role
    const key = `cache:${req.originalUrl}`;

    // 1. Check if we have a cached response
    const cachedResponse = cache.get(key);
    if (cachedResponse) {
      // Add a header so clients know it's a cached response
      res.setHeader('X-Cache', 'HIT');
      return res.status(200).json(cachedResponse);
    }

    // 2. If not, intercept the original res.json
    res.setHeader('X-Cache', 'MISS');
    const originalJson = res.json.bind(res);

    res.json = (body) => {
      // Only cache successful responses
      if (res.statusCode >= 200 && res.statusCode < 300) {
        cache.set(key, body, ttlSeconds);
      }
      return originalJson(body);
    };

    next();
  };
};

/**
 * Utility to manually invalidate cache for a given path
 * Useful for mutations (POST/PUT/DELETE) that alter cached resources
 * @param {string} urlPattern - The URL string or prefix to clear
 */
export const invalidateCache = (urlPattern) => {
  // Clear exact match or prefix
  for (const key of cache.cache.keys()) {
    if (key.includes(urlPattern)) {
      cache.del(key);
    }
  }
};
