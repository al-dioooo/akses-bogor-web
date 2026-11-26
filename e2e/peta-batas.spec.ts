import type { Page } from "@playwright/test";
import { blockingViolations } from "./axe";
import { expect, openList, test } from "./mapbox";

// Batas Kota Bogor di Peta (ADR-0053) dengan API tiruan (garis luar di e2e/mock-api/prioritas.mjs) dan Mapbox tiruan.
// Garisnya lapisan GL, jadi tes memeriksa penanda `data-batas-kota` di kontainer peta dan entri legendanya.
const main = (page: Page) => page.getByRole("main");
const mapContainer = (page: Page) => page.locator(".peta-peta .mapboxgl-map");
const legendEntry = (page: Page) => main(page).getByText("Batas Kota Bogor (garis putus-putus)");

for (const colorScheme of ["light", "dark"] as const) {
  test(`draws the Kota Bogor border once the map is ready and explains it in the legend (${colorScheme})`, async ({ page }) => {
    await page.emulateMedia({ colorScheme, reducedMotion: "reduce" });
    await page.goto("/peta");
    await expect(mapContainer(page)).toHaveAttribute("data-batas-kota", colorScheme === "dark" ? "gelap" : "terang", { timeout: 15_000 });
    await openList(page);
    await expect(legendEntry(page)).toBeVisible();
    expect(await blockingViolations(page)).toEqual([]);
  });
}

test("draws the border again after the theme changes", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/peta");
  await expect(mapContainer(page)).toHaveAttribute("data-batas-kota", "terang", { timeout: 15_000 });
  // Gaya baru menghapus semua lapisan; batasnya digambar ulang setelah gaya gelap selesai dimuat.
  await page.evaluate(() => (document.documentElement.dataset.theme = "gelap"));
  await expect(mapContainer(page)).toHaveAttribute("data-batas-kota", "gelap");
});

test("without an outline from the API the map still works and the legend leaves the line out", async ({ page }) => {
  await page.route("**/peta/batas-kecamatan", async (route) => {
    const response = await route.fetch();
    const older = (await response.json()) as Record<string, unknown>;
    delete older.outline;
    await route.fulfill({ response, json: older });
  });
  const loaded = page.waitForResponse("**/peta/batas-kecamatan");
  await page.goto("/peta");
  await expect(main(page).getByRole("group", { name: "Kontrol peta" })).toBeVisible({ timeout: 15_000 });
  await loaded;
  await openList(page);
  await expect(main(page).getByText("Legenda status")).toBeVisible();
  await expect(legendEntry(page)).toHaveCount(0);
  await expect(mapContainer(page)).not.toHaveAttribute("data-batas-kota");
});
