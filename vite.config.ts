/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: './',
  plugins: [react()],
  // Shown on the home page as the last deployment date
  define: {
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
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

