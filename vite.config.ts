/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    outDir: 'dist',
  },
  server: {
    host: true,
    port: 3000,
    strictPort: true,
  },
  test: {
    include: ['src/**/*.test.ts'],
  },
});

