import type { Page } from "@playwright/test";
import { blockingViolations } from "./axe";
import { expect, stubMapbox, test } from "./mapbox";

// Lapisan prioritas kecamatan di Peta (ADR-0043) dengan API tiruan (e2e/mock-api/prioritas.mjs) dan Mapbox tiruan.
/** IP pengunjung yang membuat API tiruan menjawab data_disabilitas_belum_aktif. */
const PRIORITY_OFF_IP = "203.0.113.251";
const main = (page: Page) => page.getByRole("main");
const toggle = (page: Page) => main(page).getByRole("button", { name: "Lapisan prioritas kecamatan" });

test("shows the priority layer with a text legend, the ranked table, the caveat and the source", async ({ page }) => {
  await page.goto("/peta");
  await expect(main(page).getByText("Memuat peta…")).toHaveCount(0);
  await expect(toggle(page)).toHaveAttribute("aria-pressed", "false");
  await toggle(page).click();
  await expect(toggle(page)).toHaveAttribute("aria-pressed", "true");
  await expect(main(page).getByRole("status").filter({ hasText: "Lapisan prioritas kecamatan tampil di peta" })).toBeAttached();
  await expect(main(page).getByRole("heading", { level: 3, name: "Prioritas kecamatan 2025" })).toBeVisible();
  const legend = main(page).getByRole("list", { name: "Legenda prioritas" });
  await expect(legend.getByRole("listitem")).toHaveText(["Rendah", "Sedang", "Tinggi", "Sangat tinggi"]);
  const rows = main(page).getByRole("table").getByRole("row");
  await expect(rows.nth(1)).toContainText("Bogor Barat");
  await expect(rows.nth(1)).toContainText("Sangat tinggi");
  await expect(main(page).getByText(/bukan jumlah seluruh penduduk; lonjakan antartahun besar/)).toBeVisible();
  await expect(main(page).getByText(/Open Data Kota Bogor, Dinas Sosial/)).toBeVisible();
  await expect(main(page).getByText("Batas kecamatan: © kontributor OpenStreetMap.")).toBeVisible();
  expect(await main(page).textContent()).not.toMatch(/cacat/i);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

  await toggle(page).click();
  await expect(toggle(page)).toHaveAttribute("aria-pressed", "false");
  await expect(main(page).getByRole("table")).toHaveCount(0);
});

test("hides the layer button while the API keeps the disability data off", async ({ browser }) => {
  const context = await browser.newContext({ extraHTTPHeaders: { "x-forwarded-for": PRIORITY_OFF_IP } });
  const page = await context.newPage();
  await stubMapbox(page);
  await page.goto("/peta");
  await expect(main(page).getByRole("heading", { level: 1 })).toBeVisible();
  await expect(main(page).getByRole("status").first()).toBeVisible();
  await expect(toggle(page)).toHaveCount(0);
  await context.close();
});

test("keeps the table when the boundaries cannot load", async ({ page }) => {
  await page.route("**/peta/batas-kecamatan", (route) => route.fulfill({ status: 503, json: { galat: "galat_api" } }));
  await page.goto("/peta");
  await toggle(page).click();
  await expect(main(page).getByRole("alert")).toContainText("Batas kecamatan tidak bisa dimuat");
  await expect(main(page).getByRole("table")).toBeVisible();
});

for (const colorScheme of ["light", "dark"] as const) {
  test(`the priority layer has no serious or critical WCAG 2.2 AA violations (${colorScheme})`, async ({ page }) => {
    await page.emulateMedia({ colorScheme, reducedMotion: "reduce" });
    await page.goto("/peta");
    await toggle(page).click();
    await expect(main(page).getByRole("table")).toBeVisible();
    expect(await blockingViolations(page)).toEqual([]);
  });
}
