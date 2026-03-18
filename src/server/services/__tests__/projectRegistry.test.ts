import { describe, it, expect, beforeEach, afterEach, afterAll, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

// The projectRegistry module computes MC_DIR = path.join(os.homedir(), '.mc') at
// module load time. We can't easily mock that because the constant is set once.
// Instead, we'll test the module's behavior by creating a wrapper that manipulates
// the actual ~/.mc/projects.json. But that's unsafe.
//
// Better approach: since MC_DIR and PROJECTS_FILE are module-level constants derived
// from os.homedir(), we use vi.hoisted + vi.mock, set a stable tmpDir BEFORE import,
// and use that for all tests.

// Create a stable tmp directory used for module initialization
const stableTmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'registry-test-stable-'));

const mockHomedir = vi.hoisted(() => vi.fn());

vi.mock('node:os', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:os')>();
  return {
    ...actual,
    default: {
      ...actual,
      homedir: mockHomedir,
    },
    homedir: mockHomedir,
  };
});

// Set the mock BEFORE the dynamic import so MC_DIR is computed correctly
mockHomedir.mockReturnValue(stableTmpDir);

const { register, list, resolve, getProject, remove, getLastUsed } = await import('../projectRegistry.js');

let projectDir: string;

beforeEach(() => {
  projectDir = path.join(stableTmpDir, 'myproject');
  fs.mkdirSync(projectDir, { recursive: true });

  // Ensure mockHomedir still points to stableTmpDir
  mockHomedir.mockReturnValue(stableTmpDir);

  // Clean up projects.json between tests
  const projectsFile = path.join(stableTmpDir, '.mc', 'projects.json');
  if (fs.existsSync(projectsFile)) {
    fs.unlinkSync(projectsFile);
  }
});

afterEach(() => {
  // Clean up the project directory created for this test
  if (fs.existsSync(projectDir)) {
    fs.rmSync(projectDir, { recursive: true, force: true });
  }
});

// Cleanup the stable tmp dir after all tests
afterAll(() => {
  fs.rmSync(stableTmpDir, { recursive: true, force: true });
});

describe('projectRegistry', () => {
  describe('register', () => {
    it('should register a new project path', () => {
      const project = register(projectDir);
      expect(project.path).toBe(projectDir);
      expect(project.name).toBe('myproject');
      expect(project.lastOpened).toBeDefined();
    });

    it('should store project in projects.json', () => {
      register(projectDir);
      const projectsFile = path.join(stableTmpDir, '.mc', 'projects.json');
      const data = JSON.parse(fs.readFileSync(projectsFile, 'utf-8'));
      expect(data.projects).toHaveLength(1);
      expect(data.projects[0].path).toBe(projectDir);
    });

    it('should set lastUsed to the registered path', () => {
      register(projectDir);
      const lastUsed = getLastUsed();
      expect(lastUsed).toBe(projectDir);
    });
  });

  describe('list', () => {
    it('should return registered projects sorted by last opened', () => {
      const proj1 = path.join(stableTmpDir, 'proj1');
      const proj2 = path.join(stableTmpDir, 'proj2');
      fs.mkdirSync(proj1, { recursive: true });
      fs.mkdirSync(proj2, { recursive: true });

      register(proj1);
      register(proj2);

      // Manually adjust timestamps in projects.json to ensure deterministic order
      const projectsFilePath = path.join(stableTmpDir, '.mc', 'projects.json');
      const data = JSON.parse(fs.readFileSync(projectsFilePath, 'utf-8'));
      data.projects[0].lastOpened = '2025-01-01T00:00:00.000Z'; // proj1 older
      data.projects[1].lastOpened = '2025-01-02T00:00:00.000Z'; // proj2 newer
      fs.writeFileSync(projectsFilePath, JSON.stringify(data, null, 2));

      const { projects } = list();
      expect(projects).toHaveLength(2);
      // proj2 has newer lastOpened, so it should be first
      expect(projects[0].path).toBe(proj2);
      expect(projects[1].path).toBe(proj1);

      // Cleanup
      fs.rmSync(proj1, { recursive: true, force: true });
      fs.rmSync(proj2, { recursive: true, force: true });
    });

    it('should return empty list when no projects registered', () => {
      const { projects } = list();
      expect(projects).toEqual([]);
    });
  });

  describe('project markers detection', () => {
    it('should detect CLAUDE.md', () => {
      fs.writeFileSync(path.join(projectDir, 'CLAUDE.md'), '# Test');
      const project = register(projectDir);
      expect(project.hasClaudeMd).toBe(true);
    });

    it('should detect docs/_index.md', () => {
      fs.mkdirSync(path.join(projectDir, 'docs'), { recursive: true });
      fs.writeFileSync(path.join(projectDir, 'docs', '_index.md'), '# Index');
      const project = register(projectDir);
      expect(project.hasIndex).toBe(true);
    });

    it('should detect .claude/ directory', () => {
      fs.mkdirSync(path.join(projectDir, '.claude'), { recursive: true });
      const project = register(projectDir);
      expect(project.hasClaude).toBe(true);
    });

    it('should detect .mc.json', () => {
      fs.writeFileSync(path.join(projectDir, '.mc.json'), '{}');
      const project = register(projectDir);
      expect(project.hasMcConfig).toBe(true);
    });

    it('should report false for missing markers', () => {
      const project = register(projectDir);
      expect(project.hasClaudeMd).toBe(false);
      expect(project.hasIndex).toBe(false);
      expect(project.hasClaude).toBe(false);
      expect(project.hasMcConfig).toBe(false);
    });
  });

  describe('resolve', () => {
    it('should resolve to absolute path', () => {
      const absPath = resolve(projectDir);
      expect(path.isAbsolute(absPath)).toBe(true);
      expect(absPath).toBe(projectDir);
    });

    it('should throw for non-existent path', () => {
      expect(() => resolve('/nonexistent/path/abc123')).toThrow(/does not exist/);
    });

    it('should throw for file path (not directory)', () => {
      const filePath = path.join(stableTmpDir, 'afile.txt');
      fs.writeFileSync(filePath, 'content');
      expect(() => resolve(filePath)).toThrow(/not a directory/);
      fs.unlinkSync(filePath);
    });
  });

  describe('duplicate registration', () => {
    it('should update lastOpened on re-registration, not create duplicate', () => {
      const first = register(projectDir);
      const firstOpened = first.lastOpened;

      const second = register(projectDir);
      expect(second.path).toBe(projectDir);

      const { projects } = list();
      expect(projects).toHaveLength(1);
      expect(new Date(second.lastOpened).getTime()).toBeGreaterThanOrEqual(
        new Date(firstOpened).getTime()
      );
    });
  });

  describe('getProject', () => {
    it('should find a registered project', () => {
      register(projectDir);
      const found = getProject(projectDir);
      expect(found).toBeDefined();
      expect(found!.path).toBe(projectDir);
    });

    it('should return undefined for unregistered project', () => {
      const found = getProject('/not/registered');
      expect(found).toBeUndefined();
    });
  });

  describe('remove', () => {
    it('should remove a registered project', () => {
      register(projectDir);
      const removed = remove(projectDir);
      expect(removed).toBe(true);
      const { projects } = list();
      expect(projects).toHaveLength(0);
    });

    it('should return false for non-existent project', () => {
      const removed = remove('/not/registered');
      expect(removed).toBe(false);
    });
  });
});
