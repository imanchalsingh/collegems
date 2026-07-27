// collegems-server/src/utils/processErrorHandlers.js

import fs from "fs";
import path from "path";

// ============================================
// CONFIGURATION
// ============================================
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const config = {
    // Log directory
    logDir: path.join(__dirname, '../../logs'),
    
    // Exit code for critical errors
    exitCode: 1,
    
    // Graceful shutdown timeout (ms)
    shutdownTimeout: 30000,
    
    // Environment
    isProduction: process.env.NODE_ENV === 'production',
    isDevelopment: process.env.NODE_ENV === 'development',
};

// Ensure log directory exists
if (!fs.existsSync(config.logDir)) {
    fs.mkdirSync(config.logDir, { recursive: true });
}

// ============================================
// LOGGER
// ============================================

const logger = {
    info: (message, data = {}) => {
        const logEntry = {
            timestamp: new Date().toISOString(),
            level: 'INFO',
            message,
            ...data,
            pid: process.pid
        };
        console.log(JSON.stringify(logEntry));
        writeToFile(logEntry);
    },
    
    error: (message, error = null) => {
        const logEntry = {
            timestamp: new Date().toISOString(),
            level: 'ERROR',
            message,
            error: error ? {
                name: error.name,
                message: error.message,
                stack: error.stack,
                code: error.code,
                syscall: error.syscall,
                path: error.path,
            } : null,
            pid: process.pid
        };
        console.error(JSON.stringify(logEntry, null, 2));
        writeToFile(logEntry);
    },
    
    fatal: (message, error = null) => {
        const logEntry = {
            timestamp: new Date().toISOString(),
            level: 'FATAL',
            message,
            error: error ? {
                name: error.name,
                message: error.message,
                stack: error.stack,
                code: error.code,
                syscall: error.syscall,
                path: error.path,
            } : null,
            pid: process.pid
        };
        console.error('🚨 FATAL:', message);
        console.error(error);
        writeToFile(logEntry);
    }
};

// Write to log file
function writeToFile(logEntry) {
    try {
        const logFile = path.join(config.logDir, `error-${new Date().toISOString().split('T')[0]}.log`);
        fs.appendFileSync(logFile, JSON.stringify(logEntry) + '\n');
    } catch (error) {
        console.error('Failed to write to log file:', error);
    }
}

// ============================================
// GRACEFUL SHUTDOWN
// ============================================

let isShuttingDown = false;

async function gracefulShutdown(signal, error = null) {
    if (isShuttingDown) {
        console.log('⚠️ Shutdown already in progress, ignoring...');
        return;
    }
    
    isShuttingDown = true;
    logger.info(`Graceful shutdown initiated`, { signal, error: error?.message });
    
    // Set timeout to force exit if graceful shutdown takes too long
    const timeout = setTimeout(() => {
        logger.error('Graceful shutdown timeout, forcing exit');
        process.exit(config.exitCode);
    }, config.shutdownTimeout);
    
    try {
        // Close database connections
        await closeDatabaseConnections();
        
        // Close Redis connections
        await closeRedisConnections();
        
        // Close server connections
        await closeServerConnections();
        
        // Flush logs
        await flushLogs();
        
        clearTimeout(timeout);
        logger.info('Graceful shutdown completed successfully');
        process.exit(0);
        
    } catch (shutdownError) {
        logger.error('Error during graceful shutdown', shutdownError);
        clearTimeout(timeout);
        process.exit(config.exitCode);
    }
}

// Close database connections (Example - customize as per your DB)
async function closeDatabaseConnections() {
    try {
        // If using Mongoose
        // const mongoose = require('mongoose');
        // await mongoose.disconnect();
        // logger.info('Database connections closed');
        
        // If using Sequelize
        // const sequelize = require('../config/database');
        // await sequelize.close();
        // logger.info('Database connections closed');
        
        logger.info('Database connections closed');
    } catch (error) {
        logger.error('Failed to close database connections', error);
        throw error;
    }
}

// Close Redis connections
async function closeRedisConnections() {
    try {
        // If using Redis
        // const redisClient = require('../config/redis');
        // await redisClient.quit();
        // logger.info('Redis connections closed');
        
        logger.info('Redis connections closed');
    } catch (error) {
        logger.error('Failed to close Redis connections', error);
        throw error;
    }
}

// Close server connections
async function closeServerConnections() {
    try {
        // Get server instance from global
        const server = global.__server;
        if (server) {
            await new Promise((resolve, reject) => {
                server.close((err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
            logger.info('Server connections closed');
        }
    } catch (error) {
        logger.error('Failed to close server connections', error);
        throw error;
    }
}

// Flush logs
async function flushLogs() {
    try {
        // If using Winston or other logging library
        // const logger = require('../config/logger');
        // await logger.flush();
        
        logger.info('Logs flushed');
    } catch (error) {
        logger.error('Failed to flush logs', error);
        throw error;
    }
}

// ============================================
// UNCAUGHT EXCEPTION HANDLER
// ============================================

function handleUncaughtException(error) {
    logger.fatal('💥 Uncaught Exception', error);
    
    // Log additional system info
    logger.info('System info', {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        memoryUsage: process.memoryUsage(),
        uptime: process.uptime(),
        pid: process.pid,
        ppid: process.ppid,
    });
    
    // In development, keep the process alive for debugging
    if (config.isDevelopment) {
        console.warn('⚠️ Uncaught Exception in development - keeping process alive for debugging');
        return;
    }
    
    // In production, graceful shutdown
    gracefulShutdown('uncaughtException', error);
}

// ============================================
// UNHANDLED REJECTION HANDLER
// ============================================

function handleUnhandledRejection(reason, promise) {
    logger.error('❌ Unhandled Promise Rejection', {
        reason: reason instanceof Error ? {
            name: reason.name,
            message: reason.message,
            stack: reason.stack,
            code: reason.code,
        } : reason,
        promise: String(promise),
    });
    
    // In development, warn but keep running
    if (config.isDevelopment) {
        console.warn('⚠️ Unhandled Rejection in development - keeping process alive for debugging');
        return;
    }
    
    // In production, graceful shutdown for critical rejections
    if (reason instanceof Error && 
        (reason.message.includes('ECONNREFUSED') || 
         reason.message.includes('EADDRINUSE') ||
         reason.message.includes('database') ||
         reason.message.includes('connection'))) {
        gracefulShutdown('unhandledRejection', reason);
    }
}

// ============================================
// WARNING HANDLER
// ============================================

function handleWarning(warning) {
    logger.info('⚠️ Node.js Warning', {
        name: warning.name,
        message: warning.message,
        stack: warning.stack,
        detail: warning.detail,
    });
    
    // Log deprecation warnings separately
    if (warning.name === 'DeprecationWarning') {
        logger.info('📅 Deprecation Warning', {
            deprecation: warning.message,
            version: process.version,
        });
    }
}

// ============================================
// EXIT HANDLER
// ============================================

function handleExit(code) {
    logger.info(`Process exiting with code: ${code}`, {
        exitCode: code,
        uptime: process.uptime(),
        pid: process.pid,
    });
}

// ============================================
// REGISTER ALL HANDLERS
// ============================================

function registerProcessErrorHandlers() {
    // Uncaught Exception Handler
    process.on('uncaughtException', handleUncaughtException);
    
    // Unhandled Rejection Handler
    process.on('unhandledRejection', handleUnhandledRejection);
    
    // Warning Handler
    process.on('warning', handleWarning);
    
    // Exit Handler
    process.on('exit', handleExit);
    
    // Signal Handlers for graceful shutdown
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGHUP', () => gracefulShutdown('SIGHUP'));
    
    // Handle SIGUSR1 and SIGUSR2 for debugging
    process.on('SIGUSR1', () => {
        logger.info('Received SIGUSR1 - performing diagnostic dump');
        console.log(JSON.stringify({
            memory: process.memoryUsage(),
            uptime: process.uptime(),
            pid: process.pid,
            nodeVersion: process.version,
        }, null, 2));
    });
    
    process.on('SIGUSR2', () => {
        logger.info('Received SIGUSR2 - triggering garbage collection');
        if (global.gc) {
            global.gc();
            logger.info('Garbage collection triggered');
        }
    });
    
    // Prevent multiple registrations
    if (global.__errorHandlersRegistered) {
        console.warn('⚠️ Process error handlers already registered');
        return;
    }
    global.__errorHandlersRegistered = true;
    
    logger.info('✅ Process error handlers registered successfully', {
        handlers: ['uncaughtException', 'unhandledRejection', 'warning', 'exit', 'SIGTERM', 'SIGINT', 'SIGHUP'],
        environment: config.isProduction ? 'production' : 'development',
    });
}

// ============================================
// UNREGISTER HANDLERS (for testing)
// ============================================

function unregisterProcessErrorHandlers() {
    process.removeListener('uncaughtException', handleUncaughtException);
    process.removeListener('unhandledRejection', handleUnhandledRejection);
    process.removeListener('warning', handleWarning);
    process.removeListener('exit', handleExit);
    process.removeListener('SIGTERM', gracefulShutdown);
    process.removeListener('SIGINT', gracefulShutdown);
    process.removeListener('SIGHUP', gracefulShutdown);
    
    global.__errorHandlersRegistered = false;
    logger.info('Process error handlers unregistered');
}

// ============================================
// EXPORT
// ============================================

export {
    registerProcessErrorHandlers,
    unregisterProcessErrorHandlers,
    gracefulShutdown,
    logger,
    config,
};