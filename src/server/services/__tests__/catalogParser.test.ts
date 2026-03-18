import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { parse } from '../catalogParser.js';

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'catalog-test-'));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

function writeIndex(content: string): void {
  const docsDir = path.join(tmpDir, 'docs');
  fs.mkdirSync(docsDir, { recursive: true });
  fs.writeFileSync(path.join(docsDir, '_index.md'), content);
}

describe('catalogParser', () => {
  describe('well-formed catalog', () => {
    it('should parse a table with deliverable rows', () => {
      writeIndex(`# Deliverable Catalog

| ID | Name | Status |
|----|------|--------|
| D1 | Authentication | Complete |
| D2 | Dashboard | In Progress |
| D3 | Search | Idea |
`);

      const entries = parse(tmpDir);
      expect(entries).toHaveLength(3);
      expect(entries[0]).toMatchObject({ id: 'D1', name: 'Authentication', status: 'Complete' });
      expect(entries[1]).toMatchObject({ id: 'D2', name: 'Dashboard', status: 'In Progress' });
      expect(entries[2]).toMatchObject({ id: 'D3', name: 'Search', status: 'Idea' });
    });

    it('should extract links from table cells', () => {
      writeIndex(`# Catalog

| ID | Name | Status | Spec | Plan |
|----|------|--------|------|------|
| D1 | Auth | Done | [spec](specs/d1_auth_spec.md) | [plan](planning/d1_auth_plan.md) |
`);

      const entries = parse(tmpDir);
      expect(entries).toHaveLength(1);
      expect(entries[0].specLink).toBe('specs/d1_auth_spec.md');
      expect(entries[0].planLink).toBe('planning/d1_auth_plan.md');
    });

    it('should extract result/complete links', () => {
      writeIndex(`# Catalog

| ID | Name | Status | Result |
|----|------|--------|--------|
| D1 | Auth | Done | [result](results/d1_auth_result.md) |
`);

      const entries = parse(tmpDir);
      expect(entries[0].resultLink).toBe('results/d1_auth_result.md');
    });
  });

  describe('missing _index.md', () => {
    it('should return empty array when _index.md does not exist', () => {
      const entries = parse(tmpDir);
      expect(entries).toEqual([]);
    });
  });

  describe('malformed table rows', () => {
    it('should skip rows without a deliverable ID', () => {
      writeIndex(`# Catalog

| ID | Name | Status |
|----|------|--------|
| D1 | Auth | Done |
| Not a deliverable | Broken | Row |
| D2 | Search | Idea |
`);

      const entries = parse(tmpDir);
      expect(entries).toHaveLength(2);
      expect(entries[0].id).toBe('D1');
      expect(entries[1].id).toBe('D2');
    });

    it('should skip rows with too few cells', () => {
      writeIndex(`# Catalog

| ID | Name | Status |
|----|------|--------|
| D1 | Auth | Done |
| |
| D2 | Search | Idea |
`);

      const entries = parse(tmpDir);
      // The single-pipe row has no meaningful cells, should be skipped
      expect(entries).toHaveLength(2);
    });
  });

  describe('empty file', () => {
    it('should return empty array for empty _index.md', () => {
      writeIndex('');
      const entries = parse(tmpDir);
      expect(entries).toEqual([]);
    });
  });

  describe('case insensitive ID matching', () => {
    it('should handle lowercase d prefix', () => {
      writeIndex(`# Catalog

| ID | Name | Status |
|----|------|--------|
| d5 | Feature | Idea |
`);

      const entries = parse(tmpDir);
      expect(entries).toHaveLength(1);
      expect(entries[0].id).toBe('D5');
    });
  });

  describe('sub-deliverable IDs', () => {
    it('should parse IDs with letter suffixes', () => {
      writeIndex(`# Catalog

| ID | Name | Status |
|----|------|--------|
| D1a | Sub-feature A | Idea |
| D1b | Sub-feature B | Idea |
`);

      const entries = parse(tmpDir);
      expect(entries).toHaveLength(2);
      expect(entries[0].id).toBe('D1a');
      expect(entries[1].id).toBe('D1b');
    });
  });
});
