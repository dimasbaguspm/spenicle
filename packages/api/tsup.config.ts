import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  outDir: 'dist',
  format: ['esm'], // Use ES modules
  target: 'node22',
  splitting: false,
  sourcemap: true,
  clean: true,
  dts: true, // Generate declaration files
});
