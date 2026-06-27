import { defineConfig, devices } from '@playwright/test';

// Playwright E2E config — kept separate from vitest (which uses src/**).
// Tests live in ./e2e and run in HEADED (visible) mode by default.
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  reporter: 'list',
  use: {
    headless: false, // görünür mod — tarayıcı penceresi açılır
    screenshot: 'only-on-failure',
    viewport: { width: 1280, height: 800 },
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
