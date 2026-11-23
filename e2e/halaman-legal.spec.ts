import { expect, test } from "@playwright/test";

// FR-50: Tentang, Kebijakan Privasi, dan Syarat Layanan bisa dibuka dari footer dan terbaca di layar 320 px.
const PAGES = [
  { link: "Tentang", path: "/tentang", heading: "Tentang AksesBogor." },
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

test("Tentang links to the privacy policy and the terms of service", async ({ page }) => {
  await page.goto("/tentang");
  const main = page.getByRole("main");
  await expect(main.getByRole("list", { name: "Cakupan AksesBogor" }).getByRole("listitem")).toHaveCount(3);
  await main.getByRole("link", { name: "Syarat Layanan" }).click();
  await expect(page).toHaveURL(/\/syarat$/);
  await page.goBack();
  await page.getByRole("main").getByRole("link", { name: "Kebijakan Privasi" }).click();
  await expect(page).toHaveURL(/\/kebijakan-privasi$/);
});

test("Kebijakan Privasi stacks the retention table below 400 px and keeps the table above it", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto("/kebijakan-privasi");
  await expect(page.getByRole("definition").filter({ hasText: "30 hari" }).first()).toBeVisible();
  await expect(page.getByRole("table", { name: "Masa simpan setiap jenis data" })).toBeHidden();
  await page.setViewportSize({ width: 480, height: 640 });
  await expect(page.getByRole("table", { name: "Masa simpan setiap jenis data" })).toBeVisible();
});

// Footer tanpa wordmark raksasa (issue #197), tetapi tetap lengkap: logo, judul kolom, tautan kebijakan, dan hak cipta.
test("the footer has no giant wordmark and keeps its headings, policy links and copyright", async ({ page }) => {
  await page.goto("/tentang");
  const footer = page.getByRole("contentinfo");
  await expect(footer.locator('[aria-hidden="true"]:not(svg):not(svg *)')).toHaveCount(0);
  await expect(footer.getByRole("heading", { level: 2 })).toHaveText(["Jelajahi", "Informasi", "Kebijakan"]);
  await expect(footer.getByRole("link", { name: "Kebijakan Privasi" })).toHaveAttribute("href", "/kebijakan-privasi");
  await expect(footer.getByRole("link", { name: "Syarat Layanan" })).toHaveAttribute("href", "/syarat");
  await expect(footer.getByText("© 2026 AksesBogor")).toBeVisible();
  // Nama situs tampil sekali, di logo.
  await expect(footer.getByText("AksesBogor", { exact: true })).toHaveCount(1);
});
