import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import express from 'express';
import request from 'supertest';
import { createFilesRouter } from '../files.js';

let tmpDir: string;
let app: express.Express;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'files-test-'));
  // Create docs directory with a test file
  const docsDir = path.join(tmpDir, 'docs');
  fs.mkdirSync(docsDir, { recursive: true });
  fs.writeFileSync(path.join(docsDir, 'test.md'), '# Hello World');
  fs.mkdirSync(path.join(docsDir, 'subdir'), { recursive: true });
  fs.writeFileSync(path.join(docsDir, 'subdir', 'nested.md'), '# Nested');

  app = express();
  app.use('/api/files', createFilesRouter(tmpDir));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('files route', () => {
  describe('valid paths', () => {
    it('should return content for a valid file within docs/', async () => {
      const res = await request(app).get('/api/files/test.md');
      expect(res.status).toBe(200);
      expect(res.body.content).toBe('# Hello World');
      expect(res.body.language).toBe('markdown');
    });

    it('should return content for nested file within docs/', async () => {
      const res = await request(app).get('/api/files/subdir/nested.md');
      expect(res.status).toBe(200);
      expect(res.body.content).toBe('# Nested');
    });
  });

  describe('path traversal prevention', () => {
    it('should reject paths containing .. sequence', async () => {
      // Express normalizes ../  in the URL path before the handler sees it,
      // so we encode the dots to bypass URL normalization
      const res = await request(app).get('/api/files/subdir/..%2F..%2Fpackage.json');
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/traversal/i);
    });

    it('should reject paths resolving outside docs/', async () => {
      // Create a file outside docs/ to ensure it can't be accessed
      fs.writeFileSync(path.join(tmpDir, 'secret.txt'), 'secret');
      // Try to access via encoded traversal
      const res = await request(app).get('/api/files/..%2Fsecret.txt');
      expect(res.status).toBe(400);
    });
  });

  describe('non-existent files', () => {
    it('should return 404 for non-existent file', async () => {
      const res = await request(app).get('/api/files/nonexistent.md');
      expect(res.status).toBe(404);
      expect(res.body.error).toMatch(/not found/i);
    });
  });

  describe('directory paths', () => {
    it('should return 400 for directory path', async () => {
      const res = await request(app).get('/api/files/subdir');
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/not a file/i);
    });
  });

  describe('language detection', () => {
    it('should detect TypeScript language', async () => {
      fs.writeFileSync(path.join(tmpDir, 'docs', 'test.ts'), 'const x = 1;');
      const res = await request(app).get('/api/files/test.ts');
      expect(res.status).toBe(200);
      expect(res.body.language).toBe('typescript');
    });

    it('should default to plaintext for unknown extensions', async () => {
      fs.writeFileSync(path.join(tmpDir, 'docs', 'test.xyz'), 'data');
      const res = await request(app).get('/api/files/test.xyz');
      expect(res.status).toBe(200);
      expect(res.body.language).toBe('plaintext');
    });
  });
});
