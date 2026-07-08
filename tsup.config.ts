import { defineConfig } from 'tsup';

const shared = {
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: false,
  target: 'es2022' as const,
  esbuildOptions(options: { conditions?: string[] }) {
    options.conditions = ['module'];
  },
};

export default defineConfig([
  {
    ...shared,
    entry: ['src/entries/api.ts'],
    format: ['esm', 'cjs'],
    platform: 'node',
    outDir: 'dist',
    clean: true,
    outExtension({ format }) {
      return { js: format === 'cjs' ? '.js' : '.mjs' };
    },
  },
  {
    ...shared,
    entry: ['src/entries/web.ts'],
    format: ['esm', 'cjs'],
    platform: 'browser',
    outDir: 'dist',
    clean: false,
    external: ['@primer-io/primer-js'],
    outExtension({ format }) {
      return { js: format === 'cjs' ? '.js' : '.mjs' };
    },
  },
]);
