import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Tes komponen klien dan fungsi kecil di jsdom (ADR-0021: lapisan pengujian di bawah Playwright). Halaman dan alur
// lengkap diuji Playwright di e2e/.
export default defineConfig({
  oxc: { jsx: { runtime: "automatic" } },
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.{ts,tsx}"],
    setupFiles: ["./vitest.setup.ts"],
  },
});
