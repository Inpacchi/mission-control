import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { parseDeliverables, getDeliverable } from '../sdlcParser.js';

let tmpDir: string;

function mkDir(...segments: string[]): string {
  const dir = path.join(tmpDir, ...segments);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function touch(dir: string, name: string, content = ''): void {
  fs.writeFileSync(path.join(dir, name), content);
}

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sdlc-test-'));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('sdlcParser', () => {
  describe('status derivation from files', () => {
    it('should derive status "complete" for _COMPLETE.md suffix', () => {
      const specsDir = mkDir('docs', 'current_work', 'specs');
      touch(specsDir, 'd1_auth_COMPLETE.md');

      const results = parseDeliverables(tmpDir);
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('D1');
      expect(results[0].status).toBe('complete');
      expect(results[0].phase).toBe('done');
    });

    it('should derive status "blocked" for _BLOCKED.md suffix', () => {
      const dir = mkDir('docs', 'current_work');
      touch(dir, 'd2_payments_BLOCKED.md');

      const results = parseDeliverables(tmpDir);
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('D2');
      expect(results[0].status).toBe('blocked');
      expect(results[0].phase).toBe('blocked');
    });

    it('should derive status "review" when result file exists', () => {
      const resultsDir = mkDir('docs', 'current_work', 'results');
      touch(resultsDir, 'd3_search_result.md');

      const results = parseDeliverables(tmpDir);
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('D3');
      expect(results[0].status).toBe('review');
      expect(results[0].phase).toBe('reviewing');
    });

    it('should derive status "in-progress" when plan and spec files exist (no result)', () => {
      const specsDir = mkDir('docs', 'current_work', 'specs');
      const planDir = mkDir('docs', 'current_work', 'planning');
      touch(specsDir, 'd4_dashboard_spec.md');
      touch(planDir, 'd4_dashboard_plan.md');

      const results = parseDeliverables(tmpDir);
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('D4');
      expect(results[0].status).toBe('in-progress');
      expect(results[0].phase).toBe('executing');
    });

    it('should derive status "plan" when only plan file exists', () => {
      const planDir = mkDir('docs', 'current_work', 'planning');
      touch(planDir, 'd5_api_plan.md');

      const results = parseDeliverables(tmpDir);
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('D5');
      expect(results[0].status).toBe('plan');
      expect(results[0].phase).toBe('planning');
    });

    it('should derive status "spec" when only spec file exists', () => {
      const specsDir = mkDir('docs', 'current_work', 'specs');
      touch(specsDir, 'd6_notifications_spec.md');

      const results = parseDeliverables(tmpDir);
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('D6');
      expect(results[0].status).toBe('spec');
      expect(results[0].phase).toBe('specifying');
    });

    it('should derive status "idea" for catalog-only entries with no files', () => {
      const docsDir = mkDir('docs');
      touch(docsDir, '_index.md', `# Deliverables

| ID | Name | Status |
|----|------|--------|
| D7 | Logging | Idea |
`);

      const results = parseDeliverables(tmpDir);
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('D7');
      expect(results[0].status).toBe('idea');
      expect(results[0].phase).toBe('idea');
    });
  });

  describe('empty docs directory', () => {
    it('should return empty array when docs/ does not exist', () => {
      const results = parseDeliverables(tmpDir);
      expect(results).toEqual([]);
    });

    it('should return empty array when docs/current_work/ is empty', () => {
      mkDir('docs', 'current_work');
      const results = parseDeliverables(tmpDir);
      expect(results).toEqual([]);
    });
  });

  describe('deliverable ID extraction', () => {
    it('should extract simple numeric IDs', () => {
      const dir = mkDir('docs', 'current_work', 'specs');
      touch(dir, 'd10_feature_spec.md');

      const results = parseDeliverables(tmpDir);
      expect(results[0].id).toBe('D10');
    });

    it('should extract sub-deliverable IDs with letter suffix', () => {
      const dir = mkDir('docs', 'current_work', 'specs');
      touch(dir, 'd1a_sub_feature_spec.md');

      const results = parseDeliverables(tmpDir);
      expect(results[0].id).toBe('D1a');
    });

    it('should extract name from filename (underscores to spaces)', () => {
      const dir = mkDir('docs', 'current_work', 'specs');
      touch(dir, 'd3_my_cool_feature_spec.md');

      const results = parseDeliverables(tmpDir);
      expect(results[0].name).toBe('my cool feature');
    });
  });

  describe('getDeliverable', () => {
    it('should find a deliverable by ID (case insensitive)', () => {
      const dir = mkDir('docs', 'current_work', 'specs');
      touch(dir, 'd1_auth_spec.md');

      const result = getDeliverable(tmpDir, 'd1');
      expect(result).toBeDefined();
      expect(result!.id).toBe('D1');
    });

    it('should return undefined for non-existent ID', () => {
      const result = getDeliverable(tmpDir, 'D999');
      expect(result).toBeUndefined();
    });
  });

  describe('sorting', () => {
    it('should sort deliverables by numeric ID', () => {
      const dir = mkDir('docs', 'current_work', 'specs');
      touch(dir, 'd10_z_spec.md');
      touch(dir, 'd2_b_spec.md');
      touch(dir, 'd1_a_spec.md');

      const results = parseDeliverables(tmpDir);
      expect(results.map((d) => d.id)).toEqual(['D1', 'D2', 'D10']);
    });
  });

  describe('chronicle scanning', () => {
    it('should include files from chronicle directory', () => {
      const chronicleDir = mkDir('docs', 'chronicle');
      touch(chronicleDir, 'd1_auth_COMPLETE.md');

      const results = parseDeliverables(tmpDir);
      expect(results).toHaveLength(1);
      expect(results[0].status).toBe('complete');
    });
  });
});
