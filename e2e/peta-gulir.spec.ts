import type { Page } from "@playwright/test";
import { expect, test } from "./mapbox";

// Peta mengunci gulir halaman selama tampil. Next menyimpan rute yang baru dikunjungi tetap terpasang tetapi tersembunyi
// (Cache Components), jadi kunci itu tidak boleh ikut ke halaman berikutnya (issue #157).
const isPhone = (page: Page) => (page.viewportSize()?.width ?? 0) < 1280;

/** Membuka satu halaman lewat menu situs (navigasi di klien): Bottom nav di bawah 1280 px, menu header di atasnya. */
async function navigate(page: Page, name: string, path: string) {
  if (isPhone(page)) {
    const nav = page.getByRole("navigation", { name: "Menu cepat" });
    const tab = nav.getByRole("link", { name, exact: true });
    if (await tab.count()) await tab.click();
    else {
      await nav.getByRole("button", { name: "Lainnya" }).click();
      await page.locator("#menu-lainnya").getByRole("link", { name, exact: true }).click();
    }
  } else {
    await page.getByRole("navigation", { name: "Menu utama" }).getByRole("link", { name, exact: true }).click();
  }
  await expect(page).toHaveURL(path);
}

/** Halaman bisa digulir dengan roda tetikus atau usapan, bukan hanya lewat skrip. */
async function expectScrolls(page: Page) {
  await expect(page.locator("body")).not.toHaveCSS("overflow", "hidden");
  await expect(page.locator("footer").last()).toBeVisible();
  await page.mouse.move(100, 300);
  await expect
    .poll(async () => {
      await page.mouse.wheel(0, 400);
      return page.evaluate(() => window.scrollY);
    })
    .toBeGreaterThan(0);
}

/** Tata letak Peta utuh: halaman terkunci setinggi layar, footer tersembunyi, dan kontrol peta tampil. */
async function expectMapLayout(page: Page) {
  await expect(page.getByRole("group", { name: "Kontrol peta" })).toBeVisible({ timeout: 15_000 });
  await expect(page.locator("body")).toHaveCSS("overflow", "hidden");
  await expect(page.locator("footer").last()).toBeHidden();
  expect(await page.evaluate(() => ({ y: window.scrollY, fits: document.documentElement.scrollHeight <= window.innerHeight }))).toEqual({ y: 0, fits: true });
}

test("pages opened after the map scroll again, and the map locks the page again on the way back", async ({ page }) => {
  await page.goto("/peta");
  await expectMapLayout(page);

  await navigate(page, "Jelajahi", "/jelajahi");
  await expectScrolls(page);

  await navigate(page, "Aksesibilitas", "/aksesibilitas");
  await expectScrolls(page);

  // Kembali ke Peta lewat tombol Back browser, lalu maju lagi.
  await page.goBack();
  await page.goBack();
  await expect(page).toHaveURL("/peta");
  await expectMapLayout(page);
  await page.goForward();
  await expect(page).toHaveURL("/jelajahi");
  await expectScrolls(page);

  // Kembali ke Peta lewat menu: kunci terpasang lagi.
  await navigate(page, "Peta", "/peta");
  await expectMapLayout(page);
});
