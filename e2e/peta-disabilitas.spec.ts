import type { Page } from "@playwright/test";
import { blockingViolations } from "./axe";
import { expect, openList, test } from "./mapbox";

// Lapisan Persebaran disabilitas (ADR-0053) dengan API tiruan (e2e/mock-api/prioritas.mjs) dan Mapbox tiruan. Tahun
// terbaru tiruan 2024: Bogor Barat 3.642 terdaftar (terbanyak), jadi empat kelas selebar 1.000.
const main = (page: Page) => page.getByRole("main");
const chooser = (page: Page) => main(page).getByRole("button", { name: "Peta tematik" });
const key = (page: Page) => main(page).locator("section.peta-kunci");
const table = (page: Page) => page.locator("#tabel-disabilitas");
const isPhone = (page: Page) => (page.viewportSize()?.width ?? 0) < 768;

async function chooseDisability(page: Page) {
  await expect(main(page).getByRole("group", { name: "Kontrol peta" })).toBeVisible({ timeout: 15_000 });
  await chooser(page).click();
  await main(page).getByRole("button", { name: "Persebaran disabilitas", exact: true }).click();
  await expect(page.locator(".mapboxgl-map")).toHaveAttribute("data-tematik", "disabilitas");
  // Di ponsel kunci mulai ringkas; Catatan membuka filter, legenda, catatan, dan sumber.
  if (isPhone(page)) await key(page).getByRole("button", { name: /^Catatan, sumber, filter/ }).click();
}

test("colours the kecamatan by registered count, with the numbers, the caveat and the source", async ({ page }) => {
  await page.goto("/peta");
  await chooseDisability(page);
  await expect(main(page).getByRole("status").filter({ hasText: "Lapisan Persebaran disabilitas tampil di peta" })).toBeAttached();
  await expect(key(page).getByRole("heading", { name: "Persebaran disabilitas 2024" })).toBeVisible();
  await expect(key(page).getByRole("combobox", { name: "Jenis disabilitas" })).toHaveValue("semua");
  await expect(key(page).getByRole("combobox", { name: "Tahun" })).toHaveValue("2024");
  await expect(key(page).getByRole("list", { name: "Legenda jumlah terdaftar" }).getByRole("listitem")).toHaveText(["0–999", "1.000–1.999", "2.000–2.999", "3.000–3.999"]);
  await expect(key(page).getByText(/terdaftar di Dinas Sosial Kota Bogor, bukan jumlah seluruh penyandang disabilitas/)).toBeVisible();
  await expect(key(page).getByText(/^Sumber: Open Data Kota Bogor, Dinas Sosial Kota Bogor, data tahun 2024\./)).toBeVisible();
  expect(await main(page).textContent()).not.toMatch(/cacat/i);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("the jenis and year filters change the key and the table", async ({ page }) => {
  await page.goto("/peta");
  await chooseDisability(page);
  await key(page).getByRole("combobox", { name: "Jenis disabilitas" }).selectOption({ label: "Disabilitas netra" });
  await key(page).getByRole("combobox", { name: "Tahun" }).selectOption("2023");
  await expect(key(page).getByRole("heading", { name: "Persebaran disabilitas 2023" })).toBeVisible();
  await expect(key(page).getByRole("list", { name: "Legenda jumlah terdaftar" }).getByRole("listitem").last()).toHaveText("600–799");

  await key(page).getByRole("button", { name: "Tabel persebaran disabilitas" }).click();
  await expect(table(page)).toBeFocused();
  await expect(table(page).getByRole("table")).toHaveAccessibleName("Penyandang disabilitas terdaftar di Dinas Sosial per kecamatan: Disabilitas netra, tahun 2023, urut dari yang terbanyak");
  const rows = table(page).getByRole("row");
  await expect(rows.nth(1)).toHaveText(/^Bogor Barat\s*607\s*600–799$/);
  await expect(rows.last()).toHaveText(/^Kota Bogor/);
  await expect(table(page).getByText(/bukan jumlah seluruh penyandang disabilitas/)).toBeVisible();
  await expect(table(page).getByRole("link", { name: /Jumlah Penyandang Disabilitas/ })).toHaveAttribute("target", "_blank");
});

test("says so when the disability data cannot load, without a table", async ({ page }) => {
  await page.route("**/peta/data-disabilitas", (route) => route.fulfill({ status: 503, json: { galat: "galat_api" } }));
  await page.goto("/peta");
  await expect(main(page).getByRole("group", { name: "Kontrol peta" })).toBeVisible({ timeout: 15_000 });
  await chooser(page).click();
  await main(page).getByRole("button", { name: "Persebaran disabilitas", exact: true }).click();
  await expect(main(page).getByRole("alert")).toContainText("Data persebaran disabilitas tidak bisa dimuat");
  await expect(page.locator(".mapboxgl-map")).not.toHaveAttribute("data-tematik");
  await openList(page);
  await expect(table(page)).toHaveCount(0);
});

test("on a 320 px phone the key starts as one line and the filters fit when opened", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "ponsel", "Ukuran ponsel ditentukan tes ini sendiri");
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto("/peta");
  await expect(main(page).getByRole("group", { name: "Kontrol peta" })).toBeVisible({ timeout: 15_000 });
  await chooser(page).click();
  await main(page).getByRole("button", { name: "Persebaran disabilitas", exact: true }).click();
  expect((await key(page).boundingBox())!.height).toBeLessThanOrEqual(60);
  await expect(key(page)).toContainText("Disabilitas 2024");
  await key(page).getByRole("button", { name: /^Catatan, sumber, filter/ }).click();
  const select = key(page).getByRole("combobox", { name: "Jenis disabilitas" });
  await select.scrollIntoViewIfNeeded();
  const box = (await select.boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(320);
  expect(box.height).toBeGreaterThanOrEqual(44);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

for (const colorScheme of ["light", "dark"] as const) {
  test(`the disability layer has no serious or critical WCAG 2.2 AA violations (${colorScheme})`, async ({ page }) => {
    await page.emulateMedia({ colorScheme, reducedMotion: "reduce" });
    await page.goto("/peta");
    await chooseDisability(page);
    await openList(page);
    await expect(table(page).getByRole("table")).toBeVisible();
    expect(await blockingViolations(page)).toEqual([]);
  });
}
