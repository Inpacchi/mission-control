import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, 'src/shared'),
    },
  },
  test: {
    globals: true,
    coverage: {
      provider: 'v8',
    },
    // Use workspace-style config for different environments
    projects: [
      {
        test: {
          name: 'server',
          include: ['src/server/**/*.test.ts', 'src/shared/**/*.test.ts'],
          environment: 'node',
        },
      },
      {
        test: {
          name: 'ui',
          include: ['src/ui/**/*.test.ts', 'src/ui/**/*.test.tsx'],
          environment: 'jsdom',
        },
      },
      {
        test: {
          name: 'unit',
          include: ['src/__tests__/**/*.test.ts'],
          environment: 'node',
        },
      },
    ],
  },
});
