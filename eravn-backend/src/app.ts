// ==========================================
// eravnProjects Backend - Express Application
// ==========================================

import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { CONFIG } from './config.js';
import logger from './logger.js';

// Controllers
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

// CORS
app.use(cors({
    origin: CONFIG.CORS_ORIGINS,
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

app.use('/api/projects', projectController);
app.use('/api/sync', syncController);
app.use('/api/settings', settingsController);
app.use('/api/logs', logsController);
app.use('/api/dashboard', dashboardController);
app.use('/api/system', systemController);

// ==========================================
// Start Server
// ==========================================

app.listen(CONFIG.PORT, () => {
    logger.info(`🚀 eravnProjects Backend running on port ${CONFIG.PORT}`);
    logger.info(`   Environment: ${process.env.NODE_ENV || 'development'}`);
    logger.info(`   GCP Project: ${CONFIG.GCP_PROJECT_ID || '(not set)'}`);
    logger.info(`   CORS Origins: ${CONFIG.CORS_ORIGINS.join(', ')}`);
});

export default app;
