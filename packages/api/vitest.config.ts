/// <reference  types="vitest" />
import { defineConfig } from 'vite';

export default defineConfig({
  test: {
    clearMocks: true,
    globals: true,
    environment: 'jsdom',
    include: ['src/**/*.test.ts'],
    passWithNoTests: true,
    fileParallelism: true,
    retry: 0,
  },
});
