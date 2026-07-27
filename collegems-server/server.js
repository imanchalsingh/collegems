// index.js or server.js
console.log("🚨🚨🚨 HELLO! THE SERVER IS ACTUALLY USING THIS FILE! 🚨🚨🚨");
import dotenv from "dotenv";
dotenv.config();

import compression from "compression";
import { initializeApp } from "./src/bootstrap/index.js";

const PORT = process.env.PORT || 5000;

// ============================================
// ENVIRONMENT VARIABLES VALIDATION
// ============================================
const requiredEnvVars = ['MONGO_URI', 'JWT_SECRET', 'JWT_REFRESH_SECRET'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
    console.error('❌ Missing required environment variables:');
    missingEnvVars.forEach(varName => console.error(`   - ${varName}`));
    
    if (process.env.NODE_ENV === 'production') {
        process.exit(1); // Exit in production
    }
}

// ============================================
// CONFIGURATION
// ============================================
const config = {
    port: parseInt(process.env.PORT) || 5000,
    env: process.env.NODE_ENV || 'development',
    isProduction: process.env.NODE_ENV === 'production',
    isDevelopment: process.env.NODE_ENV === 'development',
    isStaging: process.env.NODE_ENV === 'staging',
    
    // Compression settings
    compression: {
        enabled: process.env.COMPRESSION_ENABLED !== 'false',
        level: parseInt(process.env.COMPRESSION_LEVEL) || 6,
        threshold: parseInt(process.env.COMPRESSION_THRESHOLD) || 1024,
        memLevel: parseInt(process.env.COMPRESSION_MEM_LEVEL) || 8,
        chunkSize: parseInt(process.env.COMPRESSION_CHUNK_SIZE) || 16384,
        filter: (req, res) => {
            if (req.path === '/health' || req.path === '/ping') return false;
            if (res.getHeader('content-length') && parseInt(res.getHeader('content-length')) < 1024) return false;
            return compression.filter(req, res);
        }
    },
    
    // CORS settings
    cors: {
        origin: process.env.CORS_ORIGIN?.split(',') || '*',
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
        exposedHeaders: ['X-Total-Count', 'X-Pagination-Total'],
        maxAge: 86400 // 24 hours
    },
    
    // Rate limiting
    rateLimit: {
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW) || 900000, // 15 minutes
        max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
        message: 'Too many requests from this IP, please try again later.'
    },
    
    // Logging
    logging: {
        level: process.env.LOG_LEVEL || 'info',
        format: process.env.NODE_ENV === 'production' ? 'combined' : 'dev',
        silent: process.env.NODE_ENV === 'test'
    }
};

// ============================================
// LOGGER
// ============================================
const logger = {
    info: (message, data = {}) => {
        if (config.logging.level === 'silent') return;
        console.log(`[INFO] ${message}`, data);
    },
    error: (message, error = null) => {
        console.error(`[ERROR] ${message}`, error);
    },
    warn: (message, data = {}) => {
        if (config.logging.level === 'silent') return;
        console.warn(`[WARN] ${message}`, data);
    },
    debug: (message, data = {}) => {
        if (config.logging.level !== 'debug') return;
        console.debug(`[DEBUG] ${message}`, data);
    },
    start: (port) => {
        console.log('\n🚀 Server started successfully!');
        console.log(`📡 Running on: http://localhost:${port}`);
        console.log(`🌍 Environment: ${config.env}`);
        console.log(`📦 Compression: ${config.compression.enabled ? '✅ Enabled' : '❌ Disabled'}`);
        console.log(`🛡️  Security: ${config.isProduction ? '🔒 Production' : '🔓 Development'}`);
        console.log('='.repeat(50));
    },
    shutdown: (signal) => {
        console.log(`\n⚠️ Received ${signal}, shutting down gracefully...`);
    }
};

// ============================================
// GRACEFUL SHUTDOWN HANDLERS
// ============================================
const handleShutdown = (signal) => {
    logger.shutdown(signal);
    process.exit(0);
};

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));

process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
    if (config.isProduction) process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', { reason, promise });
    if (config.isProduction) process.exit(1);
});

// ============================================
// HEALTH CHECK ENDPOINT (Optional)
// ============================================
const addHealthCheck = (app) => {
    app.get('/health', (req, res) => {
        res.json({
            status: 'healthy',
            uptime: process.uptime(),
            timestamp: new Date().toISOString(),
            environment: config.env,
            compression: {
                enabled: config.compression.enabled,
                level: config.compression.level
            }
        });
    });
    
    app.get('/ping', (req, res) => {
        res.status(200).send('pong');
    });
};

// ============================================
// SERVER INITIALIZATION
// ============================================

/**
 * Start the application with error handling
 */
const startServer = async () => {
    try {
        // 1. Destructure both the app and the httpServer from bootstrap
        const { app, httpServer } = await initializeApp(config);
        
        // 2. Apply compression middleware to the app
        if (config.compression.enabled) {
            app.use(compression({
                level: config.compression.level,
                threshold: config.compression.threshold,
                memLevel: config.compression.memLevel,
                chunkSize: config.compression.chunkSize,
                filter: config.compression.filter
            }));
            logger.info('Compression middleware enabled', {
                level: config.compression.level,
                threshold: `${config.compression.threshold} bytes`
            });
        }

        // 3. Add health checks
        addHealthCheck(app);

        // 4. Handle port conflicts gracefully
        httpServer.once("error", (err) => {
            if (err.code === "EADDRINUSE") {
                logger.error(`Port ${config.port} is already in use. Free it or set PORT to a different value.`);
            } else {
                logger.error(`Failed to start server on port ${config.port}:`, err.message);
            }
            process.exit(1);
        });
        
        // 5. Start listening!
        const server = httpServer.listen(config.port, () => {
            logger.start(config.port);
        });
        
        // Store server instance for graceful shutdown
        global.__server = server;
        
        return { app, server };
        
    } catch (error) {
        logger.error('Failed to start server:', error);
        process.exit(1);
    }
};

// ============================================
// EXPORT & EXECUTE
// ============================================

// Execute the centralized bootstrap sequence
startServer().catch(error => {
    console.error('Fatal error during startup:', error);
    process.exit(1);
});