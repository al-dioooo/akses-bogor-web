import type { Page } from "@playwright/test";
import { blockingViolations } from "./axe";
import { expect, openList, stubMapbox, test } from "./mapbox";

// Lapisan Kecamatan paling aksesibel (ADR-0053) dengan API tiruan (e2e/mock-api/prioritas.mjs) dan Mapbox tiruan.
// Hampir semua keterangan tiruan dari OpenStreetMap dan Google Maps, jadi labelnya "belum diperiksa tim".
const PRIORITY_OFF_IP = "203.0.113.251";
const main = (page: Page) => page.getByRole("main");
const chooser = (page: Page) => main(page).getByRole("button", { name: "Peta tematik" });
const key = (page: Page) => main(page).locator("section.peta-kunci");
const list = (page: Page) => page.locator("#daftar-aksesibel");
const isPhone = (page: Page) => (page.viewportSize()?.width ?? 0) < 768;

async function chooseAccessible(page: Page, { expand = true } = {}) {
  await expect(main(page).getByRole("group", { name: "Kontrol peta" })).toBeVisible({ timeout: 15_000 });
  await chooser(page).click();
  await main(page).getByRole("button", { name: "Kecamatan paling aksesibel", exact: true }).click();
  await expect(page.locator(".mapboxgl-map")).toHaveAttribute("data-tematik", "aksesibel");
  if (expand && isPhone(page)) await key(page).getByRole("button", { name: /^Catatan, sumber, dan legenda kecamatan/ }).click();
}

test("labels the score as not checked by the team, with coverage and every source named", async ({ page }) => {
  await page.goto("/peta");
  await chooseAccessible(page);
  await expect(key(page).getByRole("heading", { level: 2 })).toHaveText("Kecamatan paling aksesibel belum diperiksa tim");
  await expect(key(page).getByRole("list", { name: "Legenda persentase" }).getByRole("listitem")).toHaveText([
    "0–24%",
    "25–49%",
    "50–74%",
    "75–100%",
    "Data belum cukup: kurang dari 5 tempat ber-keterangan",
  ]);
  await expect(key(page).getByText("Keterangan pintu masuk ada untuk 28 dari 538 tempat. 27 keterangan belum diperiksa tim: OpenStreetMap 20, Google Maps 7.")).toBeVisible();
  const sources = key(page).getByText(/^Sumber: data AksesBogor \(diperiksa tim\); OpenStreetMap \(belum diperiksa tim, .*\); salinan Google Maps diambil 23 Nov 2026 \(belum diperiksa tim\)\./);
  await expect(sources).toBeVisible();
  await expect(sources.getByRole("link", { name: "© kontributor OpenStreetMap (tab baru)" }).first()).toHaveAttribute("href", "https://www.openstreetmap.org/copyright");
  // Data pihak ketiga tidak pernah disebut terverifikasi.
  expect(await key(page).textContent()).not.toMatch(/terverifikasi|diverifikasi/i);
});

test("the ranked list next to the map gives each score with its coverage and sources, and the rest as not enough data", async ({ page }) => {
  await page.goto("/peta");
  await chooseAccessible(page);
  await key(page).getByRole("button", { name: "Daftar peringkat kecamatan paling aksesibel" }).click();
  await expect(list(page)).toBeFocused();
  const ranked = list(page).getByRole("list", { name: "Peringkat kecamatan" }).getByRole("listitem");
  await expect(ranked).toHaveCount(3);
  await expect(ranked.first()).toContainText("Peringkat 1: Bogor Barat78% bisa dimasuki");
  await expect(ranked.first()).toContainText("7 dari 9 tempat ber-keterangan pintu masuknya bisa dimasuki kursi roda · 1 terbatas");
  await expect(ranked.first()).toContainText("Keterangan ada untuk 9 dari 120 tempat");
  await expect(ranked.first()).toContainText("Data AksesBogor: 0 · belum diperiksa tim: 9 (OpenStreetMap 6, Google Maps 3)");
  await expect(ranked.nth(1)).toContainText("Bogor Tengah");
  await expect(ranked.nth(2)).toContainText("Tanah Sareal");
  await expect(list(page).getByRole("heading", { name: "Data belum cukup" })).toBeVisible();
  for (const name of ["Bogor Selatan", "Bogor Timur", "Bogor Utara"]) await expect(list(page).getByText(name, { exact: true })).toBeVisible();
  await expect(list(page).getByText("4 tempat ber-keterangan dari 101 tempat; perlu paling sedikit 5.")).toBeVisible();
  await expect(list(page).getByText(/^Cara menghitung: skor = 100 ×/)).toBeVisible();
  expect(await list(page).textContent()).not.toMatch(/terverifikasi|diverifikasi/i);
});

test("leaves Google Maps out of the key while provider hints are off", async ({ page }) => {
  await page.route("**/peta/kecamatan-aksesibel", async (route) => {
    const response = await route.fetch();
    const body = (await response.json()) as { sources: { google_maps: unknown }; caveat: string };
    body.sources.google_maps = null;
    body.caveat = "Keterangan dari OpenStreetMap belum diperiksa tim AksesBogor.";
    await route.fulfill({ response, json: body });
  });
  await page.goto("/peta");
  await chooseAccessible(page);
  await expect(key(page).getByText(/27 keterangan belum diperiksa tim, dari OpenStreetMap\./)).toBeVisible();
  expect(await key(page).textContent()).not.toMatch(/Google/);
});

test("is the only thematic map offered while the disability data is off", async ({ browser }) => {
  const context = await browser.newContext({ extraHTTPHeaders: { "x-forwarded-for": PRIORITY_OFF_IP } });
  const page = await context.newPage();
  await stubMapbox(page);
  await page.goto("/peta");
  await expect(main(page).getByRole("group", { name: "Kontrol peta" })).toBeVisible({ timeout: 15_000 });
  await chooser(page).click();
  await expect(main(page).getByRole("list", { name: "Peta tematik" }).getByRole("button")).toHaveText(["Tidak ada", "Kecamatan paling aksesibel"]);
  await context.close();
});

test("says so when the data cannot load", async ({ page }) => {
  await page.route("**/peta/kecamatan-aksesibel", (route) => route.fulfill({ status: 503, json: { galat: "galat_api" } }));
  await page.goto("/peta");
  await expect(main(page).getByRole("group", { name: "Kontrol peta" })).toBeVisible({ timeout: 15_000 });
  await chooser(page).click();
  await main(page).getByRole("button", { name: "Kecamatan paling aksesibel", exact: true }).click();
  await expect(main(page).getByRole("alert")).toContainText("Data kecamatan paling aksesibel tidak bisa dimuat");
  await openList(page);
  await expect(list(page)).toHaveCount(0);
});

test("on a 320 px phone the one-line key keeps the label, and the list opens on the full sheet", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "ponsel", "Ukuran ponsel ditentukan tes ini sendiri");
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto("/peta");
  await chooseAccessible(page, { expand: false });
  await expect(key(page)).toContainText("Paling aksesibel");
  await expect(key(page)).toContainText("belum diperiksa tim");
  expect((await key(page).boundingBox())!.height).toBeLessThanOrEqual(64);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await key(page).getByRole("button", { name: /^Catatan, sumber, dan legenda kecamatan/ }).click();
  await key(page).getByRole("button", { name: "Daftar peringkat kecamatan paling aksesibel" }).click();
  await expect(list(page)).toBeFocused();
  await expect(list(page).getByRole("list", { name: "Peringkat kecamatan" }).getByRole("listitem").first()).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

for (const colorScheme of ["light", "dark"] as const) {
  test(`the accessible kecamatan layer has no serious or critical WCAG 2.2 AA violations (${colorScheme})`, async ({ page }) => {
    await page.emulateMedia({ colorScheme, reducedMotion: "reduce" });
    await page.goto("/peta");
    await chooseAccessible(page);
    await openList(page);
    await expect(list(page)).toBeVisible();
    expect(await blockingViolations(page)).toEqual([]);
  });
}
