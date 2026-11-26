import { defineConfig, devices } from "@playwright/test";

// Port dan jumlah worker bisa diatur lewat environment. Runner self-hosted di Evergarden mengisinya per runner,
// karena dua runner berbagi jaringan host dan jatah CPU satu runner lebih kecil dari jumlah core host (issue #240).
const port = Number(process.env.E2E_PORT ?? 3100);
export const mockApiPort = Number(process.env.E2E_MOCK_API_PORT ?? 3101);
export const webServerSecret = "rahasia-tiruan-untuk-tes-playwright-saja";

// ADR-0021: pemeriksaan otomatis di CI. Diuji di ponsel (mobile-first, ADR-0012) dan desktop.
export default defineConfig({
  testDir: "./e2e",
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  // Tanpa E2E_WORKERS: bawaan Playwright, separuh jumlah core.
  workers: process.env.E2E_WORKERS ? Number(process.env.E2E_WORKERS) : undefined,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    // Browser tetap membuka localhost: Next.js menulis asal 127.0.0.1 sebagai localhost di `request.nextUrl`, sehingga
    // asal 127.0.0.1 ditolak pemeriksaan asal di src/lib/laporan-proxy.ts.
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
      // Di-bind ke 127.0.0.1 seperti produksi, yang dibuka lewat Cloudflare Tunnel (ADR-0048, issue #156).
      command: `pnpm build && pnpm start --hostname 127.0.0.1 --port ${port}`,
      url: `http://127.0.0.1:${port}`,
      // Client ID palsu supaya tombol Google tampil; skripnya diganti tiruan di e2e/google.ts.
      env: {
        API_URL: `http://localhost:${mockApiPort}`,
        NEXT_PUBLIC_GOOGLE_CLIENT_ID: "client-tiruan.apps.googleusercontent.com",
        WEB_SERVER_SECRET: webServerSecret,
        // Domain publik seperti di produksi. Pemeriksaan asal POST menerima asal ini dan asal server sendiri (issue #165).
        SITE_URL: "https://akses-bogor.aldio.dev",
      },
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
    },
  ],
});
