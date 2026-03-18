import { Router } from 'express';
import fs from 'node:fs';
import path from 'node:path';

const EXTENSION_LANGUAGES: Record<string, string> = {
  '.md': 'markdown',
  '.ts': 'typescript',
  '.tsx': 'typescript',
  '.js': 'javascript',
  '.jsx': 'javascript',
  '.json': 'json',
  '.yaml': 'yaml',
  '.yml': 'yaml',
  '.html': 'html',
  '.css': 'css',
  '.txt': 'plaintext',
};

export function createFilesRouter(getProjectPath: string | (() => string)): Router {
  const router = Router();

  const resolvePath = typeof getProjectPath === 'function' ? getProjectPath : () => getProjectPath;

  // GET /api/files/* — read-only file content, RESTRICTED to docs/ directory
  router.get('/{*filePath}', (req, res) => {
    try {
      const projectPath = resolvePath();

      // Express 5 path-to-regexp v8: {*param} yields string[]
      const rawParam = req.params.filePath;
      const requestedPath = Array.isArray(rawParam) ? rawParam.join('/') : String(rawParam);

      if (!requestedPath) {
        res.status(400).json({ error: 'File path is required' });
        return;
      }

      // Path traversal prevention: reject ../ sequences
      if (requestedPath.includes('..')) {
        res.status(400).json({ error: 'Path traversal not allowed' });
        return;
      }

      const docsDir = path.join(projectPath, 'docs');
      const resolved = path.resolve(docsDir, requestedPath);

      // Validate the resolved path is within docs/
      if (!resolved.startsWith(docsDir + path.sep) && resolved !== docsDir) {
        res.status(400).json({ error: 'Access restricted to docs/ directory' });
        return;
      }

      if (!fs.existsSync(resolved)) {
        res.status(404).json({ error: 'File not found' });
        return;
      }

      const stat = fs.statSync(resolved);
      if (!stat.isFile()) {
        res.status(400).json({ error: 'Path is not a file' });
        return;
      }

      const content = fs.readFileSync(resolved, 'utf-8');
      const ext = path.extname(resolved).toLowerCase();
      const language = EXTENSION_LANGUAGES[ext] || 'plaintext';

      res.json({ content, language });
    } catch (err) {
      console.error('[files] Error reading file:', err);
      res.status(500).json({ error: 'Failed to read file' });
    }
  });

  return router;
}
