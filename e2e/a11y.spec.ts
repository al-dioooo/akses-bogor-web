import { blockingViolations } from "./axe";
import { expect, test } from "./mapbox";

// Tambahkan setiap halaman baru di sini.
const PAGES = [
  "/",
  "/jelajahi",
  "/jelajahi?category=masjid&status=tidak_aksesibel",
  "/jelajahi?q=tidak-ada-yang-cocok",
  "/peta",
  "/peta?category=masjid&status=tidak_aksesibel",
  "/peta?q=tidak-ada-yang-cocok",
  "/lokasi/4037ba19-b366-45bc-aceb-270944fe9372",
  "/lokasi/f2aeb27d-5f54-42f8-8368-780b6d62b51c",
  "/lokasi/00000000-0000-4000-8000-000000000000",
  "/halaman-yang-tidak-ada",
];

// Mode Terang dan Gelap diuji terpisah karena warnanya berbeda (ADR-0027).
for (const path of PAGES) {
  for (const colorScheme of ["light", "dark"] as const) {
    test(`${path} (${colorScheme}) has no serious or critical WCAG 2.2 AA violations`, async ({ page }) => {
      // Gerak dikurangi supaya konten yang sedang muncul (opacity < 1) tidak mengacaukan cek kontras.
      await page.emulateMedia({ colorScheme, reducedMotion: "reduce" });
      await page.goto(path);
      expect(await blockingViolations(page)).toEqual([]);
    });
  }
}
