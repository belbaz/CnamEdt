import { defineConfig } from 'vitest/config';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.test.js', 'src/**/*.spec.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/utils/**/*.js', 'src/services/**/*.js'],
      exclude: ['**/*.test.js', '**/*.spec.js', '**/node_modules/**'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
