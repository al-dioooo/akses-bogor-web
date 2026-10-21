import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// Tambahkan setiap halaman baru di sini.
const PAGES = ["/"];

const WCAG_22_AA = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

for (const path of PAGES) {
  test(`${path} has no serious or critical WCAG 2.2 AA violations`, async ({ page }) => {
    await page.goto(path);
    const { violations } = await new AxeBuilder({ page }).withTags(WCAG_22_AA).analyze();
    const blocking = violations
      .filter((v) => v.impact === "serious" || v.impact === "critical")
      .map((v) => ({ rule: v.id, impact: v.impact, targets: v.nodes.map((n) => n.target.join(" ")) }));
    expect(blocking).toEqual([]);
  });
}
