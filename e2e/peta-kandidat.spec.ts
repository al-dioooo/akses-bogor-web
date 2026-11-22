import type { Browser, Page } from "@playwright/test";
import { blockingViolations } from "./axe";
import { expect, openList, stubMapbox, test } from "./mapbox";

// Lapisan kandidat "Belum ada data" di Peta (ADR-0049) dengan API tiruan (e2e/mock-api/kandidat.mjs) dan Mapbox tiruan.
/** IP pengunjung yang membuat API tiruan menjawab tanpa lokasi terverifikasi, seperti production sebelum ada data. */
const NO_PLACES_IP = "203.0.113.249";
const main = (page: Page) => page.getByRole("main");
const layerToggle = (page: Page) => main(page).getByRole("button", { name: "Lapisan Belum ada data" });
const credit = (page: Page) => page.locator(".mapboxgl-ctrl-attrib").getByRole("link", { name: "© kontributor OpenStreetMap" });
const STATUS_WORDS = /\b(Aksesibel|Sebagian|Tidak aksesibel|Belum diketahui)\b/;

async function withoutPlaces(browser: Browser) {
  const context = await browser.newContext({ extraHTTPHeaders: { "x-forwarded-for": NO_PLACES_IP }, viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();
  await stubMapbox(page);
  return { context, page };
}

/** Tengah bagian peta yang terlihat di samping panel: di sana tampilan awal memusatkan Kota Bogor (kandidat pertama). */
const visibleCenter = (page: Page) =>
  page.evaluate(() => {
    const frame = document.querySelector(".peta-peta")!.getBoundingClientRect();
    const panel = document.querySelector(".peta-lembar")!.getBoundingClientRect();
    return { x: (panel.right + frame.right) / 2, y: (frame.top + frame.bottom) / 2 };
  });

test("the Belum ada data layer is on, with its own legend entry, a toggle, and the OpenStreetMap credit on the map", async ({ page }) => {
  await page.goto("/peta");
  await expect(main(page).getByRole("group", { name: "Kontrol peta" })).toBeVisible({ timeout: 15_000 });
  // Atribusi ODbL tampil di peta selama lapisan menyala, menaut ke halaman hak cipta OSM.
  await expect(credit(page)).toBeVisible();
  await expect(credit(page)).toHaveAttribute("href", "https://www.openstreetmap.org/copyright");

  await openList(page);
  await expect(main(page).getByText("Belum ada data · OpenStreetMap, belum diperiksa tim")).toBeVisible();
  await expect(layerToggle(page)).toHaveAttribute("aria-pressed", "true");
  await layerToggle(page).click();
  await expect(layerToggle(page)).toHaveAttribute("aria-pressed", "false");
  await expect(credit(page)).toHaveCount(0);
  await layerToggle(page).click();
  await expect(layerToggle(page)).toHaveAttribute("aria-pressed", "true");
  await expect(credit(page)).toHaveCount(1);
  expect(await main(page).textContent()).not.toMatch(/cacat/i);
});

test("candidates stay off the map while a status or facility filter is on", async ({ page }) => {
  for (const filter of ["status=aksesibel", "facility=ramp"]) {
    await page.goto(`/peta?${filter}`);
    await expect(main(page).getByRole("group", { name: "Kontrol peta" })).toBeVisible({ timeout: 15_000 });
    await openList(page);
    await expect(layerToggle(page)).toHaveCount(0);
    await expect(main(page).getByText("Belum ada data · OpenStreetMap, belum diperiksa tim")).toHaveCount(0);
    await expect(credit(page)).toHaveCount(0);
  }
});

test("a candidate on the map opens a card without a status, with Laporkan tempat ini first", async ({ browser }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "Tengah tampilan dihitung untuk panel samping");
  const { context, page } = await withoutPlaces(browser);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/peta");
  await expect(main(page).getByRole("group", { name: "Kontrol peta" })).toBeVisible({ timeout: 15_000 });
  await expect(credit(page)).toBeVisible();
  // Tanpa lokasi terverifikasi, panel menjelaskan lingkaran abu-abu itu.
  await expect(main(page).getByText(/^Lingkaran abu-abu adalah tempat dari OpenStreetMap/)).toBeVisible();

  const center = await visibleCenter(page);
  const heading = main(page).getByRole("heading", { level: 3, name: "Masjid kandidat A" });
  await expect(async () => {
    await page.mouse.click(center.x, center.y);
    await expect(heading).toBeFocused({ timeout: 1_000 });
  }).toPass({ timeout: 10_000 });

  const card = main(page).getByRole("region", { name: "Masjid kandidat A" });
  await expect(card).toContainText("Masjid");
  await expect(card).toContainText("Bogor Tengah");
  await expect(card.getByText("Belum ada data aksesibilitas")).toBeVisible();
  await expect(card.getByText("Menurut OpenStreetMap: sebagian bisa dimasuki kursi roda")).toBeVisible();
  expect(await card.textContent()).not.toMatch(STATUS_WORDS);
  const report = card.getByRole("link", { name: "Laporkan tempat ini" });
  await expect(report).toHaveAttribute("href", "/laporkan?osm=node%2F9001&nama=Masjid+kandidat+A&kategori=masjid&lat=-6.595000&lng=106.790000");
  const osm = card.getByRole("link", { name: "Lihat di OpenStreetMap (tab baru)" });
  await expect(osm).toHaveAttribute("href", "https://www.openstreetmap.org/node/9001");
  await expect(osm).toHaveAttribute("target", "_blank");
  expect(await blockingViolations(page)).toEqual([]);

  // Menutup kartu mengembalikan daftar; dengan lapisan mati, klik di titik yang sama tidak memilih apa pun.
  await card.getByRole("button", { name: "Tutup ringkasan" }).click();
  await expect(heading).toHaveCount(0);
  await layerToggle(page).click();
  await page.mouse.click(center.x, center.y);
  await page.waitForTimeout(500);
  await expect(heading).toHaveCount(0);
  await context.close();
});
