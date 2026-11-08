import { expect, test } from "@playwright/test";

// FR-50: halaman kebijakan bisa dibuka dari footer dan terbaca di layar 320 px.
const PAGES = [
  { link: "Kebijakan Privasi", path: "/kebijakan-privasi", heading: "Kebijakan Privasi." },
  { link: "Syarat Layanan", path: "/syarat", heading: "Syarat Layanan." },
];

for (const { link, path, heading } of PAGES) {
  test(`the footer links to ${path}`, async ({ page }) => {
    await page.goto("/jelajahi");
    await page.getByRole("contentinfo").getByRole("link", { name: link, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`${path}$`));
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(heading);
  });

  test(`${path} fits a 320 px screen without scrolling sideways`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(heading);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
}

test("Kebijakan Privasi stacks the retention table below 400 px and keeps the table above it", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto("/kebijakan-privasi");
  await expect(page.getByRole("definition").filter({ hasText: "30 hari" }).first()).toBeVisible();
  await expect(page.getByRole("table", { name: "Masa simpan setiap jenis data" })).toBeHidden();
  await page.setViewportSize({ width: 480, height: 640 });
  await expect(page.getByRole("table", { name: "Masa simpan setiap jenis data" })).toBeVisible();
});
