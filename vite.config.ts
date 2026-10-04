import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
export default defineConfig({
  base: process.env.GITHUB_PAGES === 'true' ? '/omarchy-theme-editor/' : '/',
  plugins: [react()],
  test: { include: ['tests/**/*.test.ts'], environment: 'node' },
});
