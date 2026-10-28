import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// Tambahkan setiap halaman baru di sini.
const PAGES = [
  "/",
  "/jelajahi",
  "/jelajahi?category=masjid&status=tidak_aksesibel",
  "/jelajahi?q=tidak-ada-yang-cocok",
  "/lokasi/4037ba19-b366-45bc-aceb-270944fe9372",
  "/lokasi/f2aeb27d-5f54-42f8-8368-780b6d62b51c",
  "/lokasi/00000000-0000-4000-8000-000000000000",
  "/halaman-yang-tidak-ada",
];

const WCAG_22_AA = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

// Mode Glass (terang) dan Dark diuji terpisah karena warnanya berbeda (ADR-0009).
for (const path of PAGES) {
  for (const colorScheme of ["light", "dark"] as const) {
    test(`${path} (${colorScheme}) has no serious or critical WCAG 2.2 AA violations`, async ({ page }) => {
      // Gerak dikurangi supaya konten yang sedang muncul (opacity < 1) tidak mengacaukan cek kontras.
      await page.emulateMedia({ colorScheme, reducedMotion: "reduce" });
      await page.goto(path);
      const { violations } = await new AxeBuilder({ page }).withTags(WCAG_22_AA).analyze();
      const blocking = violations
        .filter((v) => v.impact === "serious" || v.impact === "critical")
        .map((v) => ({ rule: v.id, impact: v.impact, targets: v.nodes.map((n) => n.target.join(" ")) }));
      expect(blocking).toEqual([]);
    });
  }
}
