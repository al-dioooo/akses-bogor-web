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

const isPhone = (page: Page) => (page.viewportSize()?.width ?? 0) < 768;
const handle = (page: Page) => page.getByRole("slider", { name: "Tinggi panel daftar" });
const REPORT_HREF = "/laporkan?osm=node%2F9001&nama=Masjid+kandidat+A&kategori=masjid&lat=-6.595000&lng=106.790000";

test("the list has a Belum ada data section with Laporkan and Tunjukkan di peta for every candidate", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/peta");
  await expect(main(page).getByRole("group", { name: "Kontrol peta" })).toBeVisible({ timeout: 15_000 });
  await openList(page);
  // Lembar penuh di ponsel menutup peta, jadi daftar berisi semua kandidat; di desktop seluruh kota terlihat.
  if (isPhone(page)) {
    await handle(page).press("ArrowUp");
    await expect(handle(page)).toHaveAttribute("aria-valuetext", "penuh");
  }
  const section = main(page).getByRole("region", { name: "Belum ada data (24)" });
  await expect(section).toBeVisible();
  const items = section.getByRole("listitem");
  // Ditampilkan bertahap, tempat bernama dulu menurut nama.
  await expect(items).toHaveCount(20);
  await expect(items.getByRole("heading", { level: 4 }).first()).toHaveText("Kampus kandidat B");
  await expect(items.nth(3).getByRole("heading", { level: 4 })).toHaveText("Halte tanpa nama");
  await expect(section.getByRole("link", { name: "Laporkan tempat ini: Masjid kandidat A" })).toHaveAttribute("href", REPORT_HREF);
  expect(await section.textContent()).not.toMatch(STATUS_WORDS);
  await section.getByRole("button", { name: "Tampilkan 4 lagi" }).click();
  await expect(items).toHaveCount(24);
  await expect(section.getByRole("link", { name: /^Laporkan tempat ini: / }).nth(20)).toBeFocused();
  await expect(section.getByRole("button", { name: /^Tampilkan \d+ lagi$/ })).toHaveCount(0);
  expect(await blockingViolations(page)).toEqual([]);

  // Tunjukkan di peta membuka kartu kandidat; menutupnya mengembalikan fokus ke tombol itu.
  await section.getByRole("button", { name: "Tunjukkan di peta: Masjid kandidat A" }).click();
  await expect(main(page).getByRole("heading", { level: 3, name: "Masjid kandidat A" })).toBeFocused();
  await expect(main(page).getByRole("region", { name: "Masjid kandidat A" }).getByRole("link", { name: "Laporkan tempat ini" })).toHaveAttribute("href", REPORT_HREF);
  await main(page).getByRole("button", { name: "Tutup ringkasan" }).click();
  await expect(main(page).getByRole("button", { name: "Tunjukkan di peta: Masjid kandidat A" })).toBeFocused();
});

test("Laporkan tempat ini starts a new report with the name, category, and a starting pin that still needs confirming", async ({ page }) => {
  // Draf laporan baru biasa tidak tertimpa oleh laporan dari kandidat.
  await page.goto("/laporkan");
  const name = main(page).getByRole("textbox", { name: "Nama tempat" });
  await name.fill("Draf umum");
  await page.waitForTimeout(300);

  await page.goto("/peta");
  await expect(main(page).getByRole("group", { name: "Kontrol peta" })).toBeVisible({ timeout: 15_000 });
  await openList(page);
  await main(page).getByRole("link", { name: "Laporkan tempat ini: Masjid kandidat A" }).click();
  await expect(page).toHaveURL(REPORT_HREF);
  await expect(name).toHaveValue("Masjid kandidat A");
  await expect(main(page).getByRole("radio", { name: "Masjid" })).toBeChecked();
  await expect(main(page).getByText(/^Nama, kategori, dan titik awal diisi dari OpenStreetMap dan belum diperiksa/)).toBeVisible();
  await expect(main(page).getByText("Dari OpenStreetMap, sering di tengah gedung. Geser pin ke pintu masuk.")).toBeVisible();
  await expect(main(page).getByText("Lokasi dipakai", { exact: true })).toHaveCount(0);
  // Pin awal belum dipakai: langkah berikutnya meminta pelapor mengonfirmasinya.
  await page.getByRole("button", { name: "Lanjut" }).click();
  await expect(main(page).getByText("Tentukan titik lokasi, lalu tekan Pakai lokasi ini.").first()).toBeVisible();
  await main(page).getByRole("button", { name: "Pakai lokasi ini" }).click();
  await expect(main(page).getByText("Lokasi dipakai", { exact: true })).toBeVisible();

  await page.goto("/laporkan");
  await expect(name).toHaveValue("Draf umum");
  await expect(main(page).getByText(/diisi dari OpenStreetMap/)).toHaveCount(0);
});

test("a malformed candidate link opens an empty new report", async ({ page }) => {
  await page.goto("/laporkan?osm=jalan%2F1&nama=Coba&kategori=masjid");
  await expect(main(page).getByRole("textbox", { name: "Nama tempat" })).toHaveValue("");
  await expect(main(page).getByText(/diisi dari OpenStreetMap/)).toHaveCount(0);
});

test("Jelajahi stays verified-only and points to the candidates on Peta while it is empty", async ({ browser }) => {
  const { context, page } = await withoutPlaces(browser);
  await page.goto("/jelajahi");
  await expect(main(page).getByRole("heading", { name: "Belum ada lokasi" })).toBeVisible();
  await expect(main(page).getByRole("link", { name: "Lihat 24 tempat yang belum ada datanya di Peta" })).toHaveAttribute("href", "/peta");
  await expect(main(page).getByText("Masjid kandidat A")).toHaveCount(0);
  await page.goto("/jelajahi?category=masjid");
  await expect(main(page).getByRole("link", { name: /tempat yang belum ada datanya/ })).toHaveCount(0);
  await context.close();
});

/** Elemen yang difokus terlihat utuh dan tidak tertutup apa pun di titik tengahnya, tanpa digulir oleh tes (WCAG 2.4.11). */
const focusVisible = (element: Element) => {
  const box = element.getBoundingClientRect();
  const hit = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
  return document.activeElement === element && box.top >= 0 && box.bottom <= window.innerHeight && !!hit && (hit === element || element.contains(hit));
};

for (const viewport of [
  { width: 320, height: 568 },
  { width: 667, height: 375 },
]) {
  test(`keyboard focus in the Belum ada data section is never hidden (${viewport.width}×${viewport.height})`, async ({ browser }, testInfo) => {
    test.skip(testInfo.project.name !== "ponsel", "Ukuran ponsel ditentukan tes ini sendiri");
    const context = await browser.newContext({ viewport, isMobile: true, hasTouch: true, reducedMotion: "reduce" });
    const page = await context.newPage();
    await stubMapbox(page);
    await page.goto("/peta");
    await expect(main(page).getByRole("group", { name: "Kontrol peta" })).toBeVisible({ timeout: 15_000 });
    await openList(page);
    await handle(page).press("ArrowUp");
    const section = main(page).getByRole("region", { name: /^Belum ada data \(\d+\)$/ });
    const more = section.getByRole("button", { name: /^Tampilkan \d+ lagi$/ });
    // Tab maju dari tombol Lapisan di legenda sampai tombol "Tampilkan lagi"; setiap fokus di bagian itu harus terlihat.
    await main(page).getByRole("button", { name: "Lapisan Belum ada data" }).focus();
    for (let step = 0; step < 60; step++) {
      await page.keyboard.press("Tab");
      if (!(await section.evaluate((element) => element.contains(document.activeElement)))) continue;
      await expect.poll(() => page.evaluate(`(${focusVisible})(document.activeElement)`)).toBe(true);
      if (await more.evaluate((element) => element === document.activeElement)) break;
    }
    await expect(more).toBeFocused();
    await context.close();
  });
}
