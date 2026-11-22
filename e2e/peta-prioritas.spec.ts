import type { Page } from "@playwright/test";
import { blockingViolations } from "./axe";
import { expect, openList, stubMapbox, test } from "./mapbox";

// Lapisan prioritas kecamatan di Peta (ADR-0043) dengan API tiruan (e2e/mock-api/prioritas.mjs) dan Mapbox tiruan.
/** IP pengunjung yang membuat API tiruan menjawab data_disabilitas_belum_aktif. */
const PRIORITY_OFF_IP = "203.0.113.251";
const main = (page: Page) => page.getByRole("main");
const toggle = (page: Page) => main(page).getByRole("button", { name: "Lapisan prioritas kecamatan" });
/** Kunci yang mengambang di atas peta (judulnya sama dengan tabel di panel daftar). */
const floatingKey = (page: Page) => main(page).locator("section.peta-kunci");

test("shows a floating key with the levels as text, the caveat and the source while the layer is on", async ({ page }) => {
  await page.goto("/peta");
  await expect(main(page).getByText("Memuat peta…")).toHaveCount(0);
  await expect(toggle(page)).toHaveAttribute("aria-pressed", "false");
  await toggle(page).click();
  await expect(toggle(page)).toHaveAttribute("aria-pressed", "true");
  await expect(main(page).getByRole("status").filter({ hasText: "Lapisan prioritas kecamatan tampil di peta" })).toBeAttached();

  // Kunci mengambang di atas peta, tanpa membuka panel daftar.
  const key = floatingKey(page);
  await expect(key.getByRole("list", { name: "Legenda prioritas" }).getByRole("listitem")).toHaveText(["Rendah", "Sedang", "Tinggi", "Sangat tinggi"]);
  await expect(key.getByText(/bukan jumlah seluruh penduduk; lonjakan antartahun besar/)).toBeVisible();
  await expect(key.getByText(/Sumber: Open Data Kota Bogor, Dinas Sosial\. Batas kecamatan: © kontributor OpenStreetMap\./)).toBeVisible();
  // Kredit OSM menaut ke halaman hak cipta dan lisensinya (ODbL).
  await expect(key.getByRole("link", { name: "© kontributor OpenStreetMap" })).toHaveAttribute("href", "https://www.openstreetmap.org/copyright");
  await expect(key.getByRole("link", { name: "Bantu memetakan" })).toHaveAttribute("href", "/laporkan/bantu-memetakan");
  // Catatan batas data dan sumber selalu tampil bersama warnanya; tidak ada yang bisa dilipat.
  await expect(key.getByRole("button", { name: "Catatan data dan sumber" })).toHaveCount(0);
  expect(await main(page).textContent()).not.toMatch(/cacat/i);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

  await toggle(page).click();
  await expect(toggle(page)).toHaveAttribute("aria-pressed", "false");
  await expect(key).toHaveCount(0);
  await expect(main(page).getByRole("table")).toHaveCount(0);
});

for (const viewport of [
  { width: 320, height: 568 },
  { width: 360, height: 740 },
  { width: 667, height: 375 },
  { width: 1024, height: 600 },
]) {
  test(`the key never slips under the list panel, and markers under it cannot take focus (${viewport.width}×${viewport.height})`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/peta");
    await expect(main(page).getByRole("group", { name: "Kontrol peta" })).toBeVisible({ timeout: 15_000 });
    await toggle(page).click();
    const key = floatingKey(page);
    // Kunci berhenti di atas lembar bawah (ponsel) atau Bottom nav (layar lebar); isi yang tidak muat digulir di dalamnya.
    for (const part of [
      key.getByText(/bukan jumlah seluruh penduduk/),
      key.getByRole("link", { name: "© kontributor OpenStreetMap" }),
      key.getByRole("link", { name: "Bantu memetakan" }),
    ]) {
      await expect
        .poll(() =>
          part.evaluate((element) => {
            element.scrollIntoView({ block: "nearest" });
            // Baris pertama saja: tautan di dalam kalimat bisa terbagi dua baris.
            const box = element.getClientRects()[0];
            const hit = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
            return !!hit && (hit === element || element.contains(hit));
          }),
        )
        .toBe(true);
    }
    const covered = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>(".mapboxgl-marker")]
        .filter((element) => element.tabIndex === 0)
        .filter((element) => {
          const box = element.getBoundingClientRect();
          const hit = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
          return !hit || !(hit === element || element.contains(hit));
        })
        .map((element) => element.getAttribute("aria-label")),
    );
    expect(covered).toEqual([]);
  });
}

test("the table button opens the list panel at the ranked table with its source", async ({ page }) => {
  await page.goto("/peta");
  await toggle(page).click();
  await main(page).getByRole("button", { name: "Tabel prioritas kecamatan" }).click();
  await expect(page.locator("#tabel-prioritas")).toBeFocused();
  await expect(main(page).getByRole("heading", { level: 3, name: "Prioritas kecamatan 2025" })).toBeVisible();
  const rows = main(page).getByRole("table").getByRole("row");
  await expect(rows.nth(1)).toContainText("Bogor Barat");
  await expect(rows.nth(1)).toContainText("Sangat tinggi");
  const table = page.locator("#tabel-prioritas");
  await expect(table.getByText(/bukan jumlah seluruh penduduk; lonjakan antartahun besar/)).toBeVisible();
  await expect(table.getByText(/Open Data Kota Bogor, Dinas Sosial/)).toBeVisible();
  await expect(table.getByText("Batas kecamatan: © kontributor OpenStreetMap.")).toBeVisible();
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
  await main(page).getByRole("button", { name: "Tabel prioritas kecamatan" }).click();
  await expect(main(page).getByRole("table")).toBeVisible();
});

for (const colorScheme of ["light", "dark"] as const) {
  test(`the priority layer has no serious or critical WCAG 2.2 AA violations (${colorScheme})`, async ({ page }) => {
    await page.emulateMedia({ colorScheme, reducedMotion: "reduce" });
    await page.goto("/peta");
    await toggle(page).click();
    await openList(page);
    await expect(main(page).getByRole("table")).toBeVisible();
    expect(await blockingViolations(page)).toEqual([]);
  });
}
