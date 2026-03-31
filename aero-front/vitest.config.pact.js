import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    include: ['src/__tests__/pact/**/*.pact.test.js'],
    globals: true,
    setupFiles: './src/setupTests.js',
    pool: 'forks',
    poolOptions: { forks: { singleFork: true } },
    fileParallelism: false,
    testTimeout: 30000,
  },
});
