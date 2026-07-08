import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'happy-dom',
    globals: true,
    environmentMatchGlobs: [
      ['**/node-import.test.ts', 'node'],
    ],
  },
});
