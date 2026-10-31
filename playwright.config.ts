import { defineConfig, devices } from "@playwright/test";

const port = 3100;
const mockApiPort = 3101;

// ADR-0021: pemeriksaan otomatis di CI. Diuji di ponsel (mobile-first, ADR-0012) dan desktop.
export default defineConfig({
  testDir: "./e2e",
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://localhost:${port}`,
    locale: "id-ID",
    timezoneId: "Asia/Jakarta",
  },
  projects: [
    { name: "ponsel", use: { ...devices["Pixel 7"] } },
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
  ],
  // Web membaca data dari API tiruan (e2e/mock-api), bukan dari akses-bogor-api.
  webServer: [
    {
      command: "node e2e/mock-api/server.mjs",
      url: `http://localhost:${mockApiPort}/healthz`,
      env: { PORT: String(mockApiPort) },
      reuseExistingServer: !process.env.CI,
    },
    {
      command: `pnpm build && pnpm start --port ${port}`,
      url: `http://localhost:${port}`,
      env: { API_URL: `http://localhost:${mockApiPort}` },
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
    },
  ],
});
