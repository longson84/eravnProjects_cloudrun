// ==========================================
// eravnProjects Backend - Express Application
// ==========================================

import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { CONFIG } from './config.js';
import logger from './logger.js';

// Controllers
import authController from './controllers/authController.js';
import projectController from './controllers/projectController.js';
import syncController from './controllers/syncController.js';
import settingsController from './controllers/settingsController.js';
import logsController from './controllers/logsController.js';
import dashboardController from './controllers/dashboardController.js';
import systemController from './controllers/systemController.js';

const app = express();

// ==========================================
// Middleware
// ==========================================

// CORS — hỗ trợ wildcard pattern (ví dụ: https://*.web.app)
app.use(cors({
    origin: (origin, callback) => {
        // Cho phép request không có origin (server-to-server, curl, etc.)
        if (!origin) return callback(null, true);

        const allowed = CONFIG.CORS_ORIGINS.some(pattern => {
            if (pattern.includes('*')) {
                // Chuyển wildcard thành regex: https://*.web.app → /^https:\/\/.*\.web\.app$/
                const regex = new RegExp('^' + pattern.replace(/\./g, '\\.').replace(/\*/g, '.*') + '$');
                return regex.test(origin);
            }
            return pattern === origin;
        });

        callback(null, allowed);
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));

// JSON body parser
app.use(express.json());

// HTTP request logging (morgan → winston)
app.use(morgan('short', {
    stream: {
        write: (message: string) => logger.info(message.trim()),
    },
}));

// ==========================================
// Health Check
// ==========================================

app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ==========================================
// API Routes
// ==========================================

app.use('/api/auth', authController);
app.use('/api/projects', projectController);
app.use('/api/sync', syncController);
app.use('/api/settings', settingsController);
app.use('/api/logs', logsController);
app.use('/api/dashboard', dashboardController);
app.use('/api/system', systemController);

// ==========================================
// Start Server
// ==========================================

const server = app.listen(CONFIG.PORT, () => {
    logger.info(`🚀 eravnProjects Backend running on port ${CONFIG.PORT}`);
    logger.info(`   Environment: ${process.env.NODE_ENV || 'development'}`);
    logger.info(`   GCP Project: ${CONFIG.GCP_PROJECT_ID || '(not set)'}`);
    logger.info(`   CORS Origins: ${CONFIG.CORS_ORIGINS.join(', ')}`);
});

// Set server timeout to 15 minutes (900,000ms) to accommodate long syncs
server.timeout = 900000;

export default app;
