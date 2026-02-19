// ==========================================
// eravnProjects Backend - Project Controller
// ==========================================

import { Router, Request, Response } from 'express';
import * as projectService from '../services/projectService.js';
import logger from '../logger.js';

const router = Router();

// GET /api/projects
router.get('/', async (req: Request, res: Response) => {
    try {
        const projects = await projectService.getAllProjects();
        const stats = await projectService.getProjectStatsMap();

        const enriched = projects.map(p => ({
            ...p,
            stats: stats[p.id] || { todayFiles: 0, last7DaysFiles: 0 },
        }));

        res.json(enriched);
    } catch (e) {
        logger.error('GET /projects failed', { error: (e as Error).message });
        res.status(500).json({ error: (e as Error).message });
    }
});

// GET /api/projects/:id
router.get('/:id', async (req: Request, res: Response) => {
    try {
        const project = await projectService.getProjectById(req.params.id as string);
        if (!project) {
            res.status(404).json({ error: 'Project not found' });
            return;
        }
        res.json(project);
    } catch (e) {
        logger.error('GET /projects/:id failed', { error: (e as Error).message });
        res.status(500).json({ error: (e as Error).message });
    }
});

// POST /api/projects
router.post('/', async (req: Request, res: Response) => {
    try {
        const project = await projectService.createProject(req.body);
        res.status(201).json(project);
    } catch (e) {
        logger.error('POST /projects failed', { error: (e as Error).message });
        res.status(400).json({ error: (e as Error).message });
    }
});

// PUT /api/projects/:id
router.put('/:id', async (req: Request, res: Response) => {
    try {
        const project = await projectService.updateProject({ ...req.body, id: req.params.id as string });
        res.json(project);
    } catch (e) {
        logger.error('PUT /projects/:id failed', { error: (e as Error).message });
        res.status(400).json({ error: (e as Error).message });
    }
});

// DELETE /api/projects/:id
router.delete('/:id', async (req: Request, res: Response) => {
    try {
        const result = await projectService.deleteProject(req.params.id as string);
        res.json(result);
    } catch (e) {
        logger.error('DELETE /projects/:id failed', { error: (e as Error).message });
        res.status(500).json({ error: (e as Error).message });
    }
});

// POST /api/projects/:id/reset
router.post('/:id/reset', async (req: Request, res: Response) => {
    try {
        const project = await projectService.resetProject(req.params.id as string);
        res.json(project);
    } catch (e) {
        logger.error('POST /projects/:id/reset failed', { error: (e as Error).message });
        res.status(400).json({ error: (e as Error).message });
    }
});

export default router;
