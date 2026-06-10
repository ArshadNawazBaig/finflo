/// Vitest config for the React client. Component tests run in jsdom with the
/// same `@` → `src` alias as Vite, and the React plugin so JSX/Fast-Refresh-free
/// transforms work. Tests live under test/, organised by functionality into
/// folders, each file small and focused (no monolithic suites).
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(dirname, './src') },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./test/setup.js'],
    include: ['test/**/*.test.{js,jsx}'],
    css: false,
    restoreMocks: true,
    clearMocks: true,
  },
});
