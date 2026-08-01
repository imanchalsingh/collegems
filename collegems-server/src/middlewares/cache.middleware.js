/**
 * Advanced Cache Middleware
 * Security, Performance, and Reliability Features
 */

import NodeCache from 'node-cache';
import crypto from 'crypto';

// ============================================
// CONFIGURATION
// ============================================

export const CACHE_CONFIG = {
  DEFAULT_TTL: 60,
  MAX_ITEMS: 1000,
  CHECK_PERIOD: 60,
  MAX_ITEM_SIZE: 5 * 1024 * 1024, // 5MB
  STALE_TTL: 60
};

// ============================================
// CACHE CLASS
// ============================================

class SecureCache {
  constructor(options = {}) {
    this.cache = new NodeCache({
      stdTTL: options.ttl || CACHE_CONFIG.DEFAULT_TTL,
      checkperiod: options.checkPeriod || CACHE_CONFIG.CHECK_PERIOD,
      maxKeys: options.maxItems || CACHE_CONFIG.MAX_ITEMS,
      useClones: false
    });

    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      invalidations: 0,
      errors: 0
    };

    this.tags = new Map();
  }

  generateKey(req) {
    const parts = {
      method: req.method,
      url: req.originalUrl || req.url,
      query: req.query,
      user: req.user ? req.user.id : 'anonymous',
      role: req.user ? req.user.role : 'guest',
      accept: req.headers.accept || 'application/json',
      language: req.headers['accept-language'] || 'en'
    };

    if (parts.query && typeof parts.query === 'object') {
      parts.query = Object.keys(parts.query)
        .sort()
        .reduce((obj, key) => {
          obj[key] = parts.query[key];
          return obj;
        }, {});
    }

    const keyString = JSON.stringify(parts);
    return `cache:${crypto.createHash('md5').update(keyString).digest('hex')}`;
  }

  get(key) {
    try {
      const value = this.cache.get(key);
      if (value !== undefined) {
        this.stats.hits++;
        return value;
      }
      this.stats.misses++;
      return null;
    } catch (error) {
      this.stats.errors++;
      console.error('[Cache] Get error:', error);
      return null;
    }
  }

  set(key, value, ttl = null) {
    try {
      const size = Buffer.byteLength(JSON.stringify(value));
      if (size > CACHE_CONFIG.MAX_ITEM_SIZE) {
        console.warn('[Cache] Item too large:', size);
        return false;
      }

      const success = this.cache.set(key, value, ttl);
      if (success) this.stats.sets++;
      return success;
    } catch (error) {
      this.stats.errors++;
      console.error('[Cache] Set error:', error);
      return false;
    }
  }

  del(key) {
    try {
      const deleted = this.cache.del(key);
      if (deleted > 0) this.stats.invalidations++;
      return deleted;
    } catch (error) {
      this.stats.errors++;
      console.error('[Cache] Delete error:', error);
      return 0;
    }
  }

  addTag(key, tag) {
    if (!this.tags.has(tag)) {
      this.tags.set(tag, new Set());
    }
    this.tags.get(tag).add(key);
  }

  invalidateTag(tag) {
    if (this.tags.has(tag)) {
      const keys = this.tags.get(tag);
      keys.forEach(key => this.del(key));
      this.tags.delete(tag);
      return keys.size;
    }
    return 0;
  }

  invalidatePattern(pattern) {
    const keys = this.cache.keys();
    const regex = new RegExp(pattern);
    let count = 0;
    for (const key of keys) {
      if (regex.test(key)) {
        this.del(key);
        count++;
      }
    }
    return count;
  }

  getStats() {
    const total = this.stats.hits + this.stats.misses;
    return {
      ...this.stats,
      hitRate: total > 0 ? (this.stats.hits / total) * 100 : 0,
      totalRequests: total,
      currentSize: this.cache.keys().length,
      maxItems: CACHE_CONFIG.MAX_ITEMS
    };
  }

  clear() {
    this.cache.flushAll();
    this.tags.clear();
    this.stats = { hits: 0, misses: 0, sets: 0, invalidations: 0, errors: 0 };
  }
}

// ============================================
// SINGLETON INSTANCE
// ============================================

const secureCache = new SecureCache();

// ============================================
// MIDDLEWARE
// ============================================

export const cacheResponse = (options = {}) => {
  const {
    ttl = CACHE_CONFIG.DEFAULT_TTL,
    tag = null,
    varyByUser = true,
    onlyPublic = false
  } = typeof options === 'number' ? { ttl: options } : options;

  return (req, res, next) => {
    if (req.method !== 'GET') {
      return next();
    }

    if (onlyPublic && req.user) {
      return next();
    }

    const key = secureCache.generateKey(req);
    const cachedResponse = secureCache.get(key);

    if (cachedResponse !== null) {
      res.setHeader('X-Cache', 'HIT');
      return res.status(200).json(cachedResponse);
    }

    res.setHeader('X-Cache', 'MISS');
    const originalJson = res.json.bind(res);

    res.json = (body) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        secureCache.set(key, body, ttl);
        if (tag) {
          secureCache.addTag(key, tag);
        }
      }
      return originalJson(body);
    };

    next();
  };
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

export const invalidateByTag = (tag) => {
  return secureCache.invalidateTag(tag);
};

export const invalidateByPattern = (pattern) => {
  return secureCache.invalidatePattern(pattern);
};

export const clearCache = () => {
  return secureCache.clear();
};

export const getCacheStats = () => {
  return secureCache.getStats();
};

export const cacheHealth = () => {
  const stats = secureCache.getStats();
  return {
    status: stats.errors > 10 ? 'degraded' : 'healthy',
    stats
  };
};

// ============================================
// BACKWARD COMPATIBILITY
// ============================================

export const invalidateCache = (urlPattern) => {
  return secureCache.invalidatePattern(urlPattern);
};

// ============================================
// EXPORTS
// ============================================

export default {
  cacheResponse,
  invalidateCache,
  invalidateByTag,
  invalidateByPattern,
  clearCache,
  getCacheStats,
  cacheHealth,
  secureCache,
  CACHE_CONFIG
};