import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

// We mock execSync to avoid needing a real git repo
vi.mock('node:child_process', () => ({
  execSync: vi.fn(),
}));

import { execSync } from 'node:child_process';
import { getUntrackedCommits } from '../gitParser.js';

const mockedExecSync = vi.mocked(execSync);

// Helper: join fields with null byte (avoids \0 + digit octal escape issues in ESM)
const NUL = '\x00';
function gitLine(...fields: string[]): string {
  return fields.join(NUL);
}

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'git-test-'));
  vi.clearAllMocks();
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('gitParser', () => {
  describe('filtering commits by deliverable prefix', () => {
    it('should return commits without d<N>: prefix', () => {
      const output = [
        gitLine('abc123', 'Fix typo in readme', 'Alice', '2025-01-15T10:00:00Z'),
        gitLine('def456', 'Update dependencies', 'Bob', '2025-01-14T09:00:00Z'),
      ].join('\n');

      mockedExecSync.mockReturnValue(output);

      const commits = getUntrackedCommits(tmpDir);
      expect(commits).toHaveLength(2);
      expect(commits[0]).toMatchObject({
        hash: 'abc123',
        message: 'Fix typo in readme',
        author: 'Alice',
        date: '2025-01-15T10:00:00Z',
      });
      expect(commits[1]).toMatchObject({
        hash: 'def456',
        message: 'Update dependencies',
        author: 'Bob',
      });
    });

    it('should filter out commits with d1: prefix (lowercase)', () => {
      const output = [
        gitLine('abc123', 'd1: Add auth feature', 'Alice', '2025-01-15T10:00:00Z'),
        gitLine('def456', 'Fix unrelated bug', 'Bob', '2025-01-14T09:00:00Z'),
      ].join('\n');

      mockedExecSync.mockReturnValue(output);

      const commits = getUntrackedCommits(tmpDir);
      expect(commits).toHaveLength(1);
      expect(commits[0].message).toBe('Fix unrelated bug');
    });

    it('should filter out commits with D1: prefix (uppercase)', () => {
      const output = [
        gitLine('abc123', 'D1: Add auth feature', 'Alice', '2025-01-15T10:00:00Z'),
        gitLine('def456', 'Some other work', 'Bob', '2025-01-14T09:00:00Z'),
      ].join('\n');

      mockedExecSync.mockReturnValue(output);

      const commits = getUntrackedCommits(tmpDir);
      expect(commits).toHaveLength(1);
      expect(commits[0].message).toBe('Some other work');
    });

    it('should filter out commits with sub-deliverable prefix like d1a:', () => {
      const output = [
        gitLine('abc123', 'd1a: Sub-feature work', 'Alice', '2025-01-15T10:00:00Z'),
        gitLine('def456', 'Ad hoc fix', 'Bob', '2025-01-14T09:00:00Z'),
      ].join('\n');

      mockedExecSync.mockReturnValue(output);

      const commits = getUntrackedCommits(tmpDir);
      expect(commits).toHaveLength(1);
      expect(commits[0].message).toBe('Ad hoc fix');
    });
  });

  describe('null byte delimiter parsing', () => {
    it('should correctly parse fields separated by null bytes', () => {
      const output = gitLine('hash1', 'message one', 'Author One', '2025-03-01T00:00:00Z');
      mockedExecSync.mockReturnValue(output);

      const commits = getUntrackedCommits(tmpDir);
      expect(commits).toHaveLength(1);
      expect(commits[0].hash).toBe('hash1');
      expect(commits[0].message).toBe('message one');
      expect(commits[0].author).toBe('Author One');
      expect(commits[0].date).toBe('2025-03-01T00:00:00Z');
    });

    it('should skip lines with fewer than 4 null-byte-delimited parts', () => {
      const output = [
        gitLine('hash1', 'message one', 'Author One', '2025-03-01T00:00:00Z'),
        gitLine('incomplete', 'missing fields'),
        gitLine('hash2', 'message two', 'Author Two', '2025-03-02T00:00:00Z'),
      ].join('\n');

      mockedExecSync.mockReturnValue(output);

      const commits = getUntrackedCommits(tmpDir);
      expect(commits).toHaveLength(2);
      expect(commits[0].hash).toBe('hash1');
      expect(commits[1].hash).toBe('hash2');
    });
  });

  describe('non-git directory handling', () => {
    it('should return empty array when git command fails', () => {
      mockedExecSync.mockImplementation(() => {
        throw new Error('fatal: not a git repository');
      });

      const commits = getUntrackedCommits(tmpDir);
      expect(commits).toEqual([]);
    });
  });

  describe('empty output', () => {
    it('should return empty array for empty git log output', () => {
      mockedExecSync.mockReturnValue('');

      const commits = getUntrackedCommits(tmpDir);
      expect(commits).toEqual([]);
    });

    it('should return empty array for whitespace-only output', () => {
      mockedExecSync.mockReturnValue('  \n  \n  ');

      const commits = getUntrackedCommits(tmpDir);
      expect(commits).toEqual([]);
    });
  });
});
