import { defineConfig, devices } from '@playwright/test';

// Playwright critical-path E2E config. It boots the app through the SAME `vite dev` harness a
// developer runs (the mocked host/auth/adapter — no real platform), then drives the Search ->
// Results path in a real Chromium. The vitest composition-root test already proves the wiring
// headlessly; this proves it in a browser. Build-and-Test (3.6) extends the suite beyond the
// single critical path.
const PORT = 5199;
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  // A stray `test.only` must fail CI rather than silently skip the rest of the suite.
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: 'list',
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    // `--strictPort` fails fast if the port is taken instead of silently drifting to another,
    // which would leave the tests hitting a stale server.
    command: `pnpm exec vite --port ${PORT} --strictPort`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
