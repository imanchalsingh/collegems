import winston from "winston";
import httpContext from "express-http-context";
import mongoose from "mongoose";
import SystemLog from "../models/SystemLog.model.js";
import fs from "fs";
import path from "path";

// Create logs directory if it doesn't exist
const logsDir = path.join(process.cwd(), "logs");
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Custom MongoDB Transport for Winston
class MongoTransport extends winston.Transport {
  constructor(opts) {
    super(opts);
  }

  async log(info, callback) {
    setImmediate(() => {
      this.emit('logged', info);
    });

    try {
      // Save critical logs to DB for HOD Dashboard
      if (['info', 'warn', 'error'].includes(info.level) && mongoose.connection.readyState === 1) {
        SystemLog.create({
          level: info.level,
          message: info.message,
          correlationId: info.correlationId || null,
          service: "collegems-server",
          meta: info.meta || {}
        }).catch(() => {});
      }
    } catch (err) {}

    callback();
  }
}

const customFormat = winston.format.printf(({ level, message, timestamp, ...metadata }) => {
  const correlationId = httpContext.get('correlationId') || metadata.correlationId || 'N/A';
  let msg = `[${timestamp}] [${level.toUpperCase()}] [Trace: ${correlationId}] : ${message}`;
  if (Object.keys(metadata).length > 0 && metadata.correlationId === undefined) {
    msg += ` ${JSON.stringify(metadata)}`;
  }
  return msg;
});

const winstonLogger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: "collegems-server" },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
        customFormat
      ),
    }),
    new winston.transports.File({ filename: path.join(logsDir, 'error.log'), level: 'error' }),
    new winston.transports.File({ filename: path.join(logsDir, 'app.log') }),
    new MongoTransport({ level: 'info' })
  ],
});

const log = {
  info: (message, data = {}) => {
    const correlationId = httpContext.get('correlationId');
    winstonLogger.info(message, { meta: data, correlationId });
  },

  error: (message, error, data = {}) => {
    const correlationId = httpContext.get('correlationId');
    winstonLogger.error(message, { 
      meta: { ...data, stack: error?.stack || "No stack trace" }, 
      correlationId 
    });
  },

  warn: (message, data = {}) => {
    const correlationId = httpContext.get('correlationId');
    winstonLogger.warn(message, { meta: data, correlationId });
  },

  request: (method, reqPath, userId = "anonymous", statusCode = null) => {
    const correlationId = httpContext.get('correlationId');
    const reqMessage = `REQ: ${method} ${reqPath} - User: ${userId}${statusCode ? ` - Status: ${statusCode}` : ""}`;
    winstonLogger.info(reqMessage, { correlationId });
  },
};

export default log;
