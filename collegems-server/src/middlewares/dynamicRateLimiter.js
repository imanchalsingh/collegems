import rateLimit, { MemoryStore } from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import Redis from "ioredis";

/**
 * Role-based dynamic API rate limiting with optional Redis sliding-window store,
 * IP auto-ban on repeated violations, and in-memory metrics for the HOD dashboard.
 */

const WINDOW_MS = parseInt(process.env.API_WINDOW_MS, 10) || 60_000;

/** Tier limits (requests per window) — matches issue #715 */
export const RATE_TIERS = {
  public: parseInt(process.env.RL_PUBLIC_MAX, 10) || 10,
  student: parseInt(process.env.RL_STUDENT_MAX, 10) || 100,
  teacher: parseInt(process.env.RL_TEACHER_MAX, 10) || 150,
  parent: parseInt(process.env.RL_PARENT_MAX, 10) || 80,
  alumni: parseInt(process.env.RL_ALUMNI_MAX, 10) || 80,
  hod: parseInt(process.env.RL_ADMIN_MAX, 10) || 300,
  admin: parseInt(process.env.RL_ADMIN_MAX, 10) || 300,
  ml: parseInt(process.env.RL_ML_MAX, 10) || 15,
  anonymous: parseInt(process.env.API_MAX_REQUESTS, 10) || 60,
};

const VIOLATION_BAN_THRESHOLD =
  parseInt(process.env.RL_BAN_THRESHOLD, 10) || 10;
const BAN_DURATION_MS =
  parseInt(process.env.RL_BAN_DURATION_MS, 10) || 15 * 60 * 1000;
const VIOLATION_WINDOW_MS =
  parseInt(process.env.RL_VIOLATION_WINDOW_MS, 10) || 15 * 60 * 1000;

/** @type {import('ioredis').default | null} */
let redisClient = null;
let redisReady = false;
let storeBackend = "memory";

const bannedIps = new Map();
const violationBuckets = new Map();
const metrics = {
  blockedRequests: 0,
  rateLimitHits: 0,
  banEvents: 0,
  byTier: {},
  recentViolations: [],
};

const bumpTier = (tier, field) => {
  if (!metrics.byTier[tier]) {
    metrics.byTier[tier] = { hits: 0, blocks: 0 };
  }
  metrics.byTier[tier][field] += 1;
};

const pushViolation = (entry) => {
  metrics.recentViolations.unshift(entry);
  if (metrics.recentViolations.length > 100) {
    metrics.recentViolations.length = 100;
  }
};

const clientIp = (req) =>
  (req.headers["x-forwarded-for"]?.toString().split(",")[0] || "").trim() ||
  req.ip ||
  req.socket?.remoteAddress ||
  "unknown";

const normalizeRole = (req) =>
  String(req.user?.role || "anonymous").toLowerCase();

const resolveTier = (req) => {
  const role = normalizeRole(req);
  if (RATE_TIERS[role] != null) return role;
  return "anonymous";
};

const maxForRole = (req) => {
  const tier = resolveTier(req);
  return RATE_TIERS[tier] ?? RATE_TIERS.anonymous;
};

function initRedis() {
  if (
    process.env.REDIS_DISABLED === "true" ||
    process.env.NODE_ENV === "test" ||
    process.env.NODE_TEST_CONTEXT
  ) {
    storeBackend = "memory";
    return;
  }

  try {
    redisClient = new Redis({
      host: process.env.REDIS_HOST || "localhost",
      port: parseInt(process.env.REDIS_PORT, 10) || 6379,
      password: process.env.REDIS_PASSWORD || undefined,
      db: parseInt(process.env.REDIS_DB, 10) || 0,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      lazyConnect: true,
      connectTimeout: 2000,
    });

    redisClient.on("ready", () => {
      redisReady = true;
      storeBackend = "redis";
      console.info("[rate-limit] Redis store ready (sliding window)");
    });

    redisClient.on("error", (err) => {
      redisReady = false;
      storeBackend = "memory";
      console.warn("[rate-limit] Redis unavailable, using memory store:", err.message);
    });

    redisClient.on("end", () => {
      redisReady = false;
      storeBackend = "memory";
    });

    redisClient.connect().catch((err) => {
      redisReady = false;
      storeBackend = "memory";
      console.warn("[rate-limit] Redis connect failed, using memory store:", err.message);
    });
  } catch (err) {
    redisClient = null;
    storeBackend = "memory";
    console.warn("[rate-limit] Redis init failed:", err.message);
  }
}

initRedis();

/**
 * Store that prefers Redis when ready, otherwise MemoryStore.
 */
function createHybridStore(prefix) {
  const memory = new MemoryStore();
  let redisStore = null;

  const ensureRedis = () => {
    if (!redisClient || !redisReady) {
      redisStore = null;
      return null;
    }
    if (!redisStore) {
      redisStore = new RedisStore({
        sendCommand: (...args) => redisClient.call(...args),
        prefix: `rl:${prefix}:`,
      });
    }
    return redisStore;
  };

  return {
    async init(options) {
      await memory.init?.(options);
    },
    async increment(key) {
      const redis = ensureRedis();
      if (redis) {
        try {
          return await redis.increment(key);
        } catch {
          storeBackend = "memory";
        }
      }
      return memory.increment(key);
    },
    async decrement(key) {
      const redis = ensureRedis();
      if (redis) {
        try {
          return await redis.decrement(key);
        } catch {
          /* fall through */
        }
      }
      return memory.decrement?.(key);
    },
    async resetKey(key) {
      const redis = ensureRedis();
      if (redis) {
        try {
          return await redis.resetKey(key);
        } catch {
          /* fall through */
        }
      }
      return memory.resetKey(key);
    },
    async shutdown() {
      await memory.shutdown?.();
      await redisStore?.shutdown?.();
    },
  };
}

export function recordRateLimitViolation(req, tier) {
  const ip = clientIp(req);
  const now = Date.now();

  metrics.rateLimitHits += 1;
  metrics.blockedRequests += 1;
  bumpTier(tier, "blocks");

  let bucket = violationBuckets.get(ip);
  if (!bucket || now > bucket.resetAt) {
    bucket = { count: 0, resetAt: now + VIOLATION_WINDOW_MS };
  }
  bucket.count += 1;
  violationBuckets.set(ip, bucket);

  pushViolation({
    ip,
    role: normalizeRole(req),
    tier,
    path: req.originalUrl || req.url,
    method: req.method,
    at: new Date(now).toISOString(),
  });

  if (bucket.count >= VIOLATION_BAN_THRESHOLD && !isIpBanned(ip)) {
    const until = now + BAN_DURATION_MS;
    bannedIps.set(ip, {
      bannedAt: now,
      until,
      reason: `Exceeded ${VIOLATION_BAN_THRESHOLD} rate-limit violations in window`,
      violations: bucket.count,
    });
    metrics.banEvents += 1;
    console.warn(`[rate-limit] Auto-banned IP ${ip} until ${new Date(until).toISOString()}`);
  }
}

function recordViolation(req, tier) {
  return recordRateLimitViolation(req, tier);
}

export function isIpBanned(ip) {
  const ban = bannedIps.get(ip);
  if (!ban) return false;
  if (Date.now() > ban.until) {
    bannedIps.delete(ip);
    return false;
  }
  return true;
}

export function unbanIp(ip) {
  return bannedIps.delete(ip);
}

/** Test helper — clear bans/metrics between tests */
export function __resetRateLimitStateForTests() {
  bannedIps.clear();
  violationBuckets.clear();
  metrics.blockedRequests = 0;
  metrics.rateLimitHits = 0;
  metrics.banEvents = 0;
  metrics.byTier = {};
  metrics.recentViolations = [];
}

export function getSecurityMetrics() {
  const now = Date.now();
  for (const [ip, ban] of bannedIps.entries()) {
    if (now > ban.until) bannedIps.delete(ip);
  }

  return {
    storeBackend: redisReady ? "redis" : storeBackend,
    redisReady,
    windowMs: WINDOW_MS,
    tiers: { ...RATE_TIERS },
    banThreshold: VIOLATION_BAN_THRESHOLD,
    banDurationMs: BAN_DURATION_MS,
    blockedRequests: metrics.blockedRequests,
    rateLimitHits: metrics.rateLimitHits,
    banEvents: metrics.banEvents,
    byTier: { ...metrics.byTier },
    bannedIps: [...bannedIps.entries()].map(([ip, info]) => ({
      ip,
      ...info,
      untilIso: new Date(info.until).toISOString(),
    })),
    recentViolations: metrics.recentViolations.slice(0, 50),
  };
}

/**
 * Blocks auto-banned IPs before other middleware runs.
 */
export const ipBanGuard = (req, res, next) => {
  if (process.env.NODE_ENV === "test") return next();
  const ip = clientIp(req);
  if (!isIpBanned(ip)) return next();

  const ban = bannedIps.get(ip);
  metrics.blockedRequests += 1;
  return res.status(429).json({
    success: false,
    message: "Your IP has been temporarily banned due to repeated abuse.",
    bannedUntil: ban ? new Date(ban.until).toISOString() : undefined,
  });
};

function buildLimiter({ name, max, keyPrefix, message }) {
  const limiter = rateLimit({
    windowMs: WINDOW_MS,
    max,
    store: createHybridStore(keyPrefix),
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => process.env.NODE_ENV === "test",
    keyGenerator: (req) => {
      const role = normalizeRole(req);
      const id = req.user?.id || clientIp(req);
      return `${keyPrefix}:${role}:${id}`;
    },
    validate: { ip: false, keyGeneratorIpFallback: false },
    handler: (req, res, _next, options) => {
      const tier = typeof max === "function" ? resolveTier(req) : name;
      recordViolation(req, tier);
      res.status(options.statusCode).json(
        options.message || {
          success: false,
          message:
            message ||
            process.env.API_RATE_LIMIT_MESSAGE ||
            "Too many API requests. Please slow down.",
        }
      );
    },
    message: {
      success: false,
      message:
        message ||
        process.env.API_RATE_LIMIT_MESSAGE ||
        "Too many API requests. Please slow down.",
    },
  });

  return (req, res, next) => {
    bumpTier(typeof max === "function" ? resolveTier(req) : name, "hits");
    return limiter(req, res, next);
  };
}

/** Public auth endpoints — 10 req/min */
export const publicAuthLimiter = buildLimiter({
  name: "public",
  max: RATE_TIERS.public,
  keyPrefix: "auth",
  message: "Too many auth requests. Please wait and try again.",
});

/**
 * Authenticated API limiter — max depends on JWT role.
 * Student 100, Teacher 150, HOD/Admin 300, etc. per minute.
 */
export const dynamicRateLimiter = buildLimiter({
  name: "api",
  max: (req) => maxForRole(req),
  keyPrefix: "api",
});

/** High-cost ML / inference routes — 15 req/min */
export const mlInferenceLimiter = buildLimiter({
  name: "ml",
  max: RATE_TIERS.ml,
  keyPrefix: "ml",
  message: "ML inference rate limit exceeded. Please wait before retrying.",
});

export default dynamicRateLimiter;
