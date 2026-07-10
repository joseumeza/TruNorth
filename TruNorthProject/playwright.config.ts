import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 90_000,
  retries: 1,
  use: {
    baseURL: 'http://localhost:4173',
    viewport: { width: 1366, height: 768 }, // Chromebook/projector profile (spec §6.6)
  },
  webServer: {
    command: 'npm run demo',
    port: 4173,
    reuseExistingServer: true,
    timeout: 180_000,
  },
});
