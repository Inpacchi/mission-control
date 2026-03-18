import { Router } from 'express';
import path from 'node:path';
import * as terminalManager from '../services/terminalManager.js';
import * as sessionStore from '../services/sessionStore.js';
import * as projectRegistry from '../services/projectRegistry.js';

export function createSessionsRouter(getProjectPath: string | (() => string)): Router {
  const router = Router();

  const resolvePath = typeof getProjectPath === 'function' ? getProjectPath : () => getProjectPath;

  // POST /api/sessions — create session (with optional command)
  router.post('/', async (req, res) => {
    try {
      const { command, projectPath: bodyProjectPath } = req.body || {};

      // Validate that bodyProjectPath (if provided) is a registered project
      if (bodyProjectPath) {
        const absPath = path.resolve(bodyProjectPath);
        const registered = projectRegistry.getProject(absPath);
        if (!registered) {
          res.status(400).json({ error: 'Project path is not registered' });
          return;
        }
      }

      const targetPath = bodyProjectPath || resolvePath();

      const session = await terminalManager.createSession(targetPath, command);
      res.json({ session });
    } catch (err) {
      console.error('[sessions] Error creating session:', err);
      res.status(500).json({ error: `Failed to create session: ${(err as Error).message}` });
    }
  });

  // GET /api/sessions — list active sessions
  router.get('/', (_req, res) => {
    const sessions = terminalManager.listSessions();
    res.json({ sessions });
  });

  // DELETE /api/sessions/:id — kill session
  router.delete('/:id', (req, res) => {
    const success = terminalManager.killSession(req.params.id);
    res.json({ success });
  });

  // GET /api/sessions/history — past session logs
  router.get('/history', async (req, res) => {
    try {
      const targetPath = (req.query.project as string) || resolvePath();
      const search = req.query.search as string | undefined;
      const limit = parseInt(req.query.limit as string, 10) || 50;

      let sessions;
      if (search) {
        sessions = await sessionStore.searchSessions(targetPath, search, limit);
      } else {
        sessions = await sessionStore.listSessions(targetPath, limit);
      }

      res.json({ sessions });
    } catch (err) {
      console.error('[sessions] Error listing history:', err);
      res.status(500).json({ error: 'Failed to list session history' });
    }
  });

  // GET /api/sessions/history/:id/log — raw log content
  router.get('/history/:id/log', async (req, res) => {
    try {
      const targetPath = (req.query.project as string) || resolvePath();
      const log = await sessionStore.getSessionLog(req.params.id, targetPath);

      if (log === null) {
        res.status(404).json({ error: 'Session log not found' });
        return;
      }

      res.type('text/plain').send(log);
    } catch (err) {
      console.error('[sessions] Error reading log:', err);
      res.status(500).json({ error: 'Failed to read session log' });
    }
  });

  return router;
}
