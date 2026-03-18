import { describe, it, expect } from 'vitest';
import crypto from 'node:crypto';
import path from 'node:path';

/**
 * Tests for generateSlug from projectRegistry.ts.
 *
 * generateSlug is a pure function with no I/O side effects — it accepts a
 * project path string and returns a slug. We import it directly without
 * mocking os.homedir(), since the slug logic never reads the filesystem.
 *
 * Note: projectRegistry.ts is imported via a dynamic import so the os.homedir()
 * mock used in projectRegistry.test.ts does not need to be replicated here.
 * We can do a static import because generateSlug itself never triggers MC_DIR
 * construction at call time (MC_DIR is set at module scope, but the slug
 * function is a separate pure export that only uses crypto and path).
 */

// Dynamic import so we don't need to replicate the os.homedir mock. The
// module-level MC_DIR constant will point to the real ~/.mc, which is
// acceptable because generateSlug never reads it.
const { generateSlug } = await import('../projectRegistry.js');

/**
 * Reference implementation of the slug algorithm, duplicated here so the
 * tests assert observable behavior independently of the production import.
 */
function expectedSlug(projectPath: string): string {
  const hash = crypto.createHash('sha256').update(projectPath).digest('hex').slice(0, 12);
  const base = path
    .basename(projectPath)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `${base}-${hash}`;
}

describe('generateSlug', () => {
  describe('determinism', () => {
    it('returns the same slug for the same path on repeated calls', () => {
      const projectPath = '/home/user/projects/myapp';
      const first = generateSlug(projectPath);
      const second = generateSlug(projectPath);
      expect(first, 'slug must be identical on every call for the same input path').toBe(second);
    });

    it('returns the expected slug for a known Unix-style path', () => {
      const projectPath = '/home/user/projects/myapp';
      expect(generateSlug(projectPath), 'slug must match the SHA-256-derived expected value').toBe(
        expectedSlug(projectPath)
      );
    });

    it('returns the expected slug for a known path with uppercase and spaces in basename', () => {
      const projectPath = '/home/user/My Project';
      expect(generateSlug(projectPath), 'slug must match expected value for basename with spaces').toBe(
        expectedSlug(projectPath)
      );
    });
  });

  describe('collision resistance', () => {
    it('produces different slugs for two paths with the same basename but different parents', () => {
      const alicePath = '/home/alice/projects/myapp';
      const bobPath = '/home/bob/projects/myapp';
      const aliceSlug = generateSlug(alicePath);
      const bobSlug = generateSlug(bobPath);
      expect(
        aliceSlug,
        'two projects with identical basenames but different parent paths must produce different slugs'
      ).not.toBe(bobSlug);
    });

    it('produces different slugs for two paths that share only a common suffix', () => {
      const path1 = '/workspaces/project-a/app';
      const path2 = '/workspaces/project-b/app';
      expect(
        generateSlug(path1),
        'slugs must differ even when only the parent directory name differs'
      ).not.toBe(generateSlug(path2));
    });
  });

  describe('URL safety', () => {
    it('slug contains only lowercase alphanumeric characters and hyphens', () => {
      const projectPath = '/home/user/projects/myapp';
      const slug = generateSlug(projectPath);
      expect(slug, 'slug must consist only of [a-z0-9-] characters').toMatch(/^[a-z0-9-]+$/);
    });

    it('slug does not start or end with a hyphen', () => {
      const projectPath = '/home/user/projects/myapp';
      const slug = generateSlug(projectPath);
      expect(slug, 'slug must not start with a hyphen').not.toMatch(/^-/);
      expect(slug, 'slug must not end with a hyphen').not.toMatch(/-$/);
    });

    it('normalises special characters in basename to hyphens', () => {
      // Basename "My Project!" contains uppercase, a space, and a '!'
      const projectPath = '/home/user/My Project!';
      const slug = generateSlug(projectPath);
      expect(slug, 'slug must be URL-safe when basename contains special characters').toMatch(
        /^[a-z0-9-]+$/
      );
    });

    it('slug format is "basename-hash" where hash is 12 hex characters', () => {
      const projectPath = '/home/user/projects/myapp';
      const slug = generateSlug(projectPath);
      // The slug must end with a hyphen followed by exactly 12 hex characters
      expect(slug, 'slug must end with a 12-character hex hash').toMatch(/^.+-[0-9a-f]{12}$/);
    });
  });

  describe('basename extraction', () => {
    it('uses the last segment of the path as the human-readable prefix', () => {
      const projectPath = '/home/user/projects/awesome-tool';
      const slug = generateSlug(projectPath);
      expect(slug, 'slug should start with the lowercased basename').toMatch(/^awesome-tool-/);
    });

    it('lowercases the basename portion of the slug', () => {
      const projectPath = '/home/user/projects/AwesomeTool';
      const slug = generateSlug(projectPath);
      expect(slug, 'slug basename portion must be entirely lowercase').toMatch(/^awesometool-/);
    });
  });
});
