import { defineConfig, devices } from "@playwright/test"

// E2E tests run against a production build (`pnpm build && pnpm start`) using the dev
// Supabase project from .env.local. Run with `pnpm test:e2e`. Set E2E_BASE_URL to test a
// deployed site instead (e.g. https://licitot.vercel.app); no local server is started then.
const PORT = Number(process.env.E2E_PORT ?? 3100)
const REMOTE = process.env.E2E_BASE_URL

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL: REMOTE ?? `http://localhost:${PORT}`,
    locale: "ro-RO",
    timezoneId: "Europe/Bucharest",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "mobile", use: { ...devices["Pixel 7"] } },
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: REMOTE
    ? undefined
    : {
        command: `pnpm start -p ${PORT}`,
        port: PORT,
        reuseExistingServer: true,
      },
})
