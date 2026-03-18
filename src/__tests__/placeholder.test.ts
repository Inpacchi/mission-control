import { describe, it, expect } from 'vitest';

describe('Mission Control scaffolding', () => {
  it('should pass a basic assertion', () => {
    expect(1 + 1).toBe(2);
  });

  it('should have shared types importable', async () => {
    const types = await import('../shared/types.js');
    // Verify the module exports exist (types are erased at runtime,
    // but the module should load without error)
    expect(types).toBeDefined();
  });
});
