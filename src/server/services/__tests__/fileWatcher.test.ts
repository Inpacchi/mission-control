import { describe, it, expect, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createFileWatcher, type FileWatcherHandle } from '../fileWatcher.js';

let tmpDir: string;
let handle: FileWatcherHandle | null = null;

function makeTmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'mc-fw-test-'));
}

afterEach(async () => {
  if (handle) {
    await handle.close();
    handle = null;
  }
  if (tmpDir && fs.existsSync(tmpDir)) {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

describe('fileWatcher', () => {
  it('returns a no-op watcher when docs/ does not exist', async () => {
    tmpDir = makeTmpDir();
    // No docs/ directory created
    const onUpdate = vi.fn();
    handle = createFileWatcher({ projectPath: tmpDir, onUpdate });

    // Should not throw when closing
    await handle.close();
    expect(onUpdate).not.toHaveBeenCalled();
  });

  it('detects a new file in docs/', async () => {
    tmpDir = makeTmpDir();
    const docsDir = path.join(tmpDir, 'docs');
    const currentWork = path.join(docsDir, 'current_work', 'specs');
    fs.mkdirSync(currentWork, { recursive: true });

    const onUpdate = vi.fn();
    handle = createFileWatcher({ projectPath: tmpDir, onUpdate });

    // Wait for watcher to be ready
    await new Promise((resolve) => setTimeout(resolve, 300));

    // Create a deliverable spec file
    fs.writeFileSync(
      path.join(currentWork, 'd1_test_feature_spec.md'),
      '# D1 Test Feature Spec'
    );

    // Wait for debounce (200ms) + file stabilization + buffer
    await new Promise((resolve) => setTimeout(resolve, 800));

    expect(onUpdate).toHaveBeenCalled();
    const deliverables = onUpdate.mock.calls[onUpdate.mock.calls.length - 1][0];
    expect(Array.isArray(deliverables)).toBe(true);
  });

  it('detects file deletion', async () => {
    tmpDir = makeTmpDir();
    const docsDir = path.join(tmpDir, 'docs');
    const currentWork = path.join(docsDir, 'current_work', 'specs');
    fs.mkdirSync(currentWork, { recursive: true });

    // Create a file before starting the watcher
    const filePath = path.join(currentWork, 'd2_deletion_test_spec.md');
    fs.writeFileSync(filePath, '# D2 Deletion Test');

    const onUpdate = vi.fn();
    handle = createFileWatcher({ projectPath: tmpDir, onUpdate });

    // Wait for watcher to be ready
    await new Promise((resolve) => setTimeout(resolve, 300));

    // Delete the file
    fs.unlinkSync(filePath);

    // Wait for debounce + buffer
    await new Promise((resolve) => setTimeout(resolve, 800));

    expect(onUpdate).toHaveBeenCalled();
  });

  it('detects file rename', async () => {
    tmpDir = makeTmpDir();
    const docsDir = path.join(tmpDir, 'docs');
    const currentWork = path.join(docsDir, 'current_work', 'specs');
    fs.mkdirSync(currentWork, { recursive: true });

    // Create a file before starting the watcher
    const oldPath = path.join(currentWork, 'd3_rename_test_spec.md');
    fs.writeFileSync(oldPath, '# D3 Rename Test');

    const onUpdate = vi.fn();
    handle = createFileWatcher({ projectPath: tmpDir, onUpdate });

    // Wait for watcher to be ready
    await new Promise((resolve) => setTimeout(resolve, 300));

    // Rename the file (simulates status change)
    const newPath = path.join(currentWork, 'd3_rename_test_COMPLETE.md');
    fs.renameSync(oldPath, newPath);

    // Wait for debounce + buffer (rename triggers unlink + add)
    await new Promise((resolve) => setTimeout(resolve, 800));

    expect(onUpdate).toHaveBeenCalled();
  });

  it('debounces rapid changes into a single callback', async () => {
    tmpDir = makeTmpDir();
    const docsDir = path.join(tmpDir, 'docs');
    const currentWork = path.join(docsDir, 'current_work', 'specs');
    fs.mkdirSync(currentWork, { recursive: true });

    const onUpdate = vi.fn();
    handle = createFileWatcher({ projectPath: tmpDir, onUpdate });

    // Wait for watcher to be ready
    await new Promise((resolve) => setTimeout(resolve, 300));

    // Create multiple files in rapid succession
    for (let i = 1; i <= 5; i++) {
      fs.writeFileSync(
        path.join(currentWork, `d${i}_rapid_spec.md`),
        `# D${i}`
      );
    }

    // Wait for debounce to settle
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Due to debouncing, we should see fewer calls than files created
    // (could be 1-2 calls depending on timing, but definitely not 5)
    expect(onUpdate.mock.calls.length).toBeLessThanOrEqual(3);
    expect(onUpdate.mock.calls.length).toBeGreaterThanOrEqual(1);
  });
});
