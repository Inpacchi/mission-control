import { Router } from 'express';
import * as projectRegistry from '../services/projectRegistry.js';
import * as terminalManager from '../services/terminalManager.js';

export function createProjectsRouter(
  switchProjectContext: (newPath: string) => Promise<void>,
  getProjectPath: () => string,
): Router {
  const router = Router();

  // GET /api/projects — list registered projects
  router.get('/', (_req, res) => {
    try {
      const { projects, lastUsed } = projectRegistry.list();
      const activeSessions = terminalManager.listSessions();
      res.json({
        projects,
        lastUsed,
        activeProject: getProjectPath(),
        activeSessionCount: activeSessions.length,
      });
    } catch (err) {
      console.error('[projects] Error listing projects:', err);
      res.status(500).json({ error: 'Failed to list projects' });
    }
  });

  // POST /api/projects/switch — switch active project
  router.post('/switch', async (req, res) => {
    try {
      const { path: projectPath } = req.body || {};
      if (!projectPath || typeof projectPath !== 'string') {
        res.status(400).json({ error: 'Missing required field: path' });
        return;
      }

      // Register/update and trigger full server re-initialization
      await switchProjectContext(projectPath);

      const project = projectRegistry.getProject(projectPath);
      if (!project) {
        res.status(500).json({ error: 'Failed to register project after switch' });
        return;
      }

      res.json({ project });
    } catch (err) {
      console.error('[projects] Error switching project:', err);
      res.status(400).json({ error: (err as Error).message });
    }
  });

  return router;
}
