import { Router } from 'express';
import { parseDeliverables, parseChronicle, getDeliverable } from '../services/sdlcParser.js';
import { parse as parseCatalog } from '../services/catalogParser.js';
import { getUntrackedCommits } from '../services/gitParser.js';
import type { DeliverableStatus, SdlcStats } from '../../shared/types.js';

export function createSdlcRouter(getProjectPath: string | (() => string)): Router {
  const router = Router();

  const resolvePath = typeof getProjectPath === 'function' ? getProjectPath : () => getProjectPath;

  // GET /api/sdlc/deliverables — full kanban state
  router.get('/deliverables', async (_req, res) => {
    try {
      const deliverables = await parseDeliverables(resolvePath());
      res.json({ deliverables });
    } catch (err) {
      console.error('[sdlc] Error parsing deliverables:', err);
      res.status(500).json({ error: 'Failed to parse deliverables' });
    }
  });

  // GET /api/sdlc/catalog — parsed _index.md
  router.get('/catalog', async (_req, res) => {
    try {
      const entries = await parseCatalog(resolvePath());
      res.json({ entries });
    } catch (err) {
      console.error('[sdlc] Error parsing catalog:', err);
      res.status(500).json({ error: 'Failed to parse catalog' });
    }
  });

  // GET /api/sdlc/deliverable/:id — single deliverable with timeline
  router.get('/deliverable/:id', async (req, res) => {
    try {
      const deliverable = await getDeliverable(resolvePath(), req.params.id);
      if (!deliverable) {
        res.status(404).json({ error: 'Deliverable not found' });
        return;
      }
      res.json({ deliverable });
    } catch (err) {
      console.error('[sdlc] Error getting deliverable:', err);
      res.status(500).json({ error: 'Failed to get deliverable' });
    }
  });

  // GET /api/sdlc/stats — summary counts
  router.get('/stats', async (_req, res) => {
    try {
      const projectPath = resolvePath();
      const deliverables = await parseDeliverables(projectPath);
      const untracked = getUntrackedCommits(projectPath);

      const byStatus: Record<DeliverableStatus, number> = {
        idea: 0,
        spec: 0,
        plan: 0,
        'in-progress': 0,
        review: 0,
        complete: 0,
        blocked: 0,
      };

      for (const d of deliverables) {
        byStatus[d.status]++;
      }

      const stats: SdlcStats = {
        total: deliverables.length,
        byStatus,
        untracked: untracked.length,
      };

      res.json(stats);
    } catch (err) {
      console.error('[sdlc] Error computing stats:', err);
      res.status(500).json({ error: 'Failed to compute stats' });
    }
  });

  // GET /api/sdlc/untracked — untracked git commits
  router.get('/untracked', (_req, res) => {
    try {
      const commits = getUntrackedCommits(resolvePath());
      res.json({ commits });
    } catch (err) {
      console.error('[sdlc] Error getting untracked commits:', err);
      res.status(500).json({ error: 'Failed to get untracked commits' });
    }
  });

  // GET /api/sdlc/chronicle — archived deliverables
  router.get('/chronicle', async (_req, res) => {
    try {
      const deliverables = await parseChronicle(resolvePath());
      res.json({ deliverables });
    } catch (err) {
      console.error('[sdlc] Error parsing chronicle:', err);
      res.status(500).json({ error: 'Failed to parse chronicle' });
    }
  });

  return router;
}
