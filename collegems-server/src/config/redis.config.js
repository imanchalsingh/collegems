import IORedis from "ioredis";
import log from "../utils/logger.js";

const MOCK_REDIS =
  process.env.MOCK_REDIS === "true" ||
  process.env.REDIS_DISABLED === "true";

let connection = null;
let connectionReady = false;
let connectionError = null;

/**
 * Shared Redis connection options for BullMQ.
 * BullMQ requires maxRetriesPerRequest: null on the connection.
 */
export function getRedisOptions() {
  return {
    host: process.env.REDIS_HOST || "localhost",
    port: Number(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    db: Number(process.env.REDIS_DB) || 0,
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
    lazyConnect: true,
  };
}

export function isRedisMockMode() {
  return MOCK_REDIS || Boolean(connectionError);
}

export function isRedisReady() {
  return connectionReady && !MOCK_REDIS;
}

/**
 * Create (or return) a shared ioredis client. Never throws — fails soft for OSS demos.
 */
export async function getRedisConnection() {
  if (MOCK_REDIS) {
    connectionError = "MOCK_REDIS=true";
    return null;
  }

  if (connection && connectionReady) return connection;

  try {
    connection = new IORedis(getRedisOptions());
    connection.on("error", (err) => {
      connectionError = err.message;
      connectionReady = false;
      log.warn?.(`Redis error: ${err.message}`) ||
        console.warn(`Redis error: ${err.message}`);
    });
    connection.on("ready", () => {
      connectionReady = true;
      connectionError = null;
      console.log("Redis connected for BullMQ queues");
    });
    await connection.connect();
    connectionReady = true;
    return connection;
  } catch (err) {
    connectionError = err.message;
    connectionReady = false;
    console.warn(
      `Redis unavailable (${err.message}) — BullMQ will use in-memory fallback`
    );
    return null;
  }
}

export async function closeRedisConnection() {
  if (connection) {
    try {
      await connection.quit();
    } catch {
      connection.disconnect();
    }
    connection = null;
    connectionReady = false;
  }
}

export default {
  getRedisConnection,
  getRedisOptions,
  closeRedisConnection,
  isRedisMockMode,
  isRedisReady,
};
