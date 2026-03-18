import { Router } from 'express';
import { loadConfig } from '../services/configLoader.js';

export function createConfigRouter(getProjectPath: string | (() => string)): Router {
  const router = Router();

  const resolvePath = typeof getProjectPath === 'function' ? getProjectPath : () => getProjectPath;

  // GET /api/config — current config (merged defaults + .mc.json)
  router.get('/', (_req, res) => {
    try {
      const projectPath = resolvePath();
      const config = loadConfig(projectPath);
      res.json({ ...config, projectPath });
    } catch (err) {
      console.error('[config] Error loading config:', err);
      res.status(500).json({ error: 'Failed to load config' });
    }
  });

  return router;
}
