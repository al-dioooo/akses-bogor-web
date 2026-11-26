import type { Page } from "@playwright/test";
import { blockingViolations } from "./axe";
import { expect, test } from "./mapbox";

// Pemilih Peta tematik (ADR-0053) dengan API tiruan dan Mapbox tiruan: satu lapisan sekaligus, bisa dipakai dengan
// keyboard saja, dan tidak terpotong di layar sempit.
const main = (page: Page) => page.getByRole("main");
const chooser = (page: Page) => main(page).getByRole("button", { name: "Peta tematik" });
const choices = (page: Page) => main(page).getByRole("list", { name: "Peta tematik" });

test("is used with the keyboard alone: open, move, choose, and close with Escape", async ({ page }) => {
  await page.goto("/peta");
  await expect(main(page).getByRole("group", { name: "Kontrol peta" })).toBeVisible({ timeout: 15_000 });
  await chooser(page).focus();
  await page.keyboard.press("Enter");
  await expect(chooser(page)).toHaveAttribute("aria-expanded", "true");
  // Setiap pilihan punya nama pendek dan penjelasan terpisah.
  const prioritas = choices(page).getByRole("button", { name: "Prioritas pemetaan", exact: true });
  await expect(prioritas).toHaveAccessibleDescription(/penyandang disabilitas terdaftar/);
  await page.keyboard.press("Tab");
  await expect(choices(page).getByRole("button", { name: "Tidak ada", exact: true })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(prioritas).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(chooser(page)).toBeFocused();
  await expect(chooser(page)).toHaveAttribute("aria-expanded", "false");
  await expect(page.locator(".mapboxgl-map")).toHaveAttribute("data-tematik", "prioritas");

  await page.keyboard.press("Enter");
  await expect(prioritas).toHaveAttribute("aria-pressed", "true");
  await page.keyboard.press("Escape");
  await expect(chooser(page)).toHaveAttribute("aria-expanded", "false");
  await expect(chooser(page)).toBeFocused();

  // Fokus yang keluar dari daftar menutupnya.
  await page.keyboard.press("Enter");
  await page.keyboard.press("Shift+Tab");
  await expect(chooser(page)).toHaveAttribute("aria-expanded", "false");
});

test("closes when tapped outside, without changing the layer", async ({ page }) => {
  await page.goto("/peta");
  await expect(main(page).getByRole("group", { name: "Kontrol peta" })).toBeVisible({ timeout: 15_000 });
  await chooser(page).click();
  await expect(choices(page)).toBeVisible();
  const size = page.viewportSize()!;
  await page.mouse.click(size.width - 24, Math.round(size.height * 0.45));
  await expect(choices(page)).toBeHidden();
  await expect(page.locator(".mapboxgl-map")).not.toHaveAttribute("data-tematik");
});

for (const viewport of [
  { width: 320, height: 568 },
  { width: 667, height: 375 },
  { width: 1280, height: 720 },
]) {
  test(`the open chooser fits on screen above the bottom nav and every choice can be reached (${viewport.width}×${viewport.height})`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto("/peta");
    await expect(main(page).getByRole("group", { name: "Kontrol peta" })).toBeVisible({ timeout: 15_000 });
    await chooser(page).click();
    const panel = page.locator(".peta-pilihan");
    const box = (await panel.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    for (const choice of await choices(page).getByRole("button").all()) {
      await choice.scrollIntoViewIfNeeded();
      const hit = await choice.evaluate((element) => {
        const rect = element.getBoundingClientRect();
        const found = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
        return !!found && element.contains(found);
      });
      expect(hit).toBe(true);
    }
  });
}

for (const colorScheme of ["light", "dark"] as const) {
  test(`the open chooser has no serious or critical WCAG 2.2 AA violations (${colorScheme})`, async ({ page }) => {
    await page.emulateMedia({ colorScheme, reducedMotion: "reduce" });
    await page.goto("/peta");
    await expect(main(page).getByRole("group", { name: "Kontrol peta" })).toBeVisible({ timeout: 15_000 });
    await chooser(page).click();
    await expect(choices(page)).toBeVisible();
    expect(await blockingViolations(page)).toEqual([]);
  });
}
