import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// Tambahkan setiap halaman baru di sini.
const PAGES = ["/"];

const WCAG_22_AA = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

// Mode Glass (terang) dan Dark diuji terpisah karena warnanya berbeda (ADR-0009).
for (const path of PAGES) {
  for (const colorScheme of ["light", "dark"] as const) {
    test(`${path} (${colorScheme}) has no serious or critical WCAG 2.2 AA violations`, async ({ page }) => {
      await page.emulateMedia({ colorScheme });
      await page.goto(path);
      const { violations } = await new AxeBuilder({ page }).withTags(WCAG_22_AA).analyze();
      const blocking = violations
        .filter((v) => v.impact === "serious" || v.impact === "critical")
        .map((v) => ({ rule: v.id, impact: v.impact, targets: v.nodes.map((n) => n.target.join(" ")) }));
      expect(blocking).toEqual([]);
    });
  }
}
