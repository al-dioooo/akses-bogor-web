import type { Page } from "@playwright/test";
import { blockingViolations } from "./axe";
import { expect, stubMapbox, test } from "./mapbox";

// Peta layar penuh: panel daftar (lembar bawah di ponsel, panel samping mulai 768 px), dengan API dan Mapbox tiruan.
const placeList = (page: Page) => page.getByRole("list", { name: /^(Daftar lokasi|Lokasi di tampilan peta)$/ });

/** IP pengunjung yang mendapat data kosong dari API tiruan, seperti production sebelum ada lokasi. */
const NO_PLACES_IP = "203.0.113.249";

/**
 * Elemen digulir ke tampilan di panel, lalu harus terlihat di layar dan tidak tertutup elemen lain (panel, Bottom nav)
 * di titik tengahnya.
 */
const uncovered = (element: Element) => {
  element.scrollIntoView({ block: "nearest" });
  const box = element.getBoundingClientRect();
  const hit = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
  return box.top >= 0 && box.bottom <= window.innerHeight && !!hit && (hit === element || element.contains(hit));
};

async function openMap(page: Page, path = "/peta") {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(path);
  await expect(page.getByRole("status").filter({ hasText: /^(Menampilkan \d+ lokasi|\d+ dari \d+ lokasi)$/ })).toBeVisible();
}

test("the map fills the screen under a slim header, without the footer or any scrolling", async ({ page }) => {
  await openMap(page);
  await expect(page.getByRole("contentinfo")).toBeHidden();
  const layout = await page.evaluate(() => {
    const header = document.querySelector("body > header")!.getBoundingClientRect();
    const main = document.querySelector("main")!.getBoundingClientRect();
    return {
      header: header.height,
      mainTop: main.top,
      mainBottom: main.bottom,
      height: window.innerHeight,
      scrollHeight: document.documentElement.scrollHeight,
      scrollWidth: document.documentElement.scrollWidth,
      width: window.innerWidth,
    };
  });
  expect(layout.header).toBeLessThanOrEqual(64);
  expect(layout.mainTop).toBeCloseTo(layout.header, 0);
  expect(layout.mainBottom).toBeCloseTo(layout.height, 0);
  expect(layout.scrollHeight).toBeLessThanOrEqual(layout.height);
  expect(layout.scrollWidth).toBeLessThanOrEqual(layout.width);
});

for (const width of [360, 1024, 1280]) {
  test(`at ${width} px nothing scrolls sideways and the panel clears the bottom nav`, async ({ page }) => {
    await page.setViewportSize({ width, height: 760 });
    await openMap(page);
    await expect(placeList(page)).toBeVisible();
    const sizes = await page.evaluate(() => {
      const nav = [...document.querySelectorAll("nav")].find((element) => getComputedStyle(element).position === "fixed");
      const panel = document.querySelector(".peta-lembar")!.getBoundingClientRect();
      const toggle = document.querySelector<HTMLElement>("#judul-daftar-peta")!.getBoundingClientRect();
      return {
        scrollWidth: document.documentElement.scrollWidth,
        width: window.innerWidth,
        navTop: nav && getComputedStyle(nav).display !== "none" ? nav.getBoundingClientRect().top : null,
        panelBottom: panel.bottom,
        toggleBottom: toggle.bottom,
      };
    });
    expect(sizes.scrollWidth).toBeLessThanOrEqual(sizes.width);
    if (width >= 1280) expect(sizes.navTop).toBeNull();
    // Kepala panel tidak pernah tertutup Bottom nav; di layar lebar panel berhenti di atasnya.
    if (sizes.navTop !== null) expect(sizes.toggleBottom).toBeLessThanOrEqual(sizes.navTop);
    if (sizes.navTop !== null && width >= 768) expect(sizes.panelBottom).toBeLessThanOrEqual(sizes.navTop);
  });
}

for (const viewport of [
  { width: 360, height: 740 },
  { width: 667, height: 375 },
  { width: 915, height: 412 },
  { width: 1024, height: 768 },
  { width: 1440, height: 900 },
]) {
  test(`the loading search placeholder is as tall as the search bar it turns into (${viewport.width}×${viewport.height})`, async ({ browser }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "Ukuran layar ditentukan tes ini sendiri");
    // Kecamatan dari API tiruan datang terlambat, jadi kerangka Peta tampil cukup lama untuk diukur.
    const context = await browser.newContext({ viewport, reducedMotion: "reduce", extraHTTPHeaders: { "x-forwarded-for": "203.0.113.248" } });
    const page = await context.newPage();
    await stubMapbox(page);
    await page.goto("/peta", { waitUntil: "commit" });
    const placeholder = page.locator(".peta-cari[aria-hidden='true']");
    await placeholder.waitFor();
    const before = (await placeholder.boundingBox())!;
    const search = page.getByRole("search");
    await search.waitFor();
    await expect(placeholder).toHaveCount(0);
    const after = (await search.boundingBox())!;
    expect(after.height).toBeCloseTo(before.height, 0);
    expect(after.y).toBeCloseTo(before.y, 0);
    await context.close();
  });
}

test("the skip link jumps past the map to the list", async ({ page }) => {
  await openMap(page);
  const skip = page.getByRole("link", { name: "Lewati peta ke daftar lokasi" });
  await skip.focus();
  await expect(skip).toBeVisible();
  await skip.press("Enter");
  await expect(page.getByRole("heading", { level: 2, name: /^(Daftar lokasi|Lokasi di tampilan peta)$/ })).toBeFocused();
  await expect(placeList(page)).toBeVisible();
});

for (const colorScheme of ["light", "dark"] as const) {
  test(`the open panel has no serious WCAG 2.2 AA violations (${colorScheme})`, async ({ page }) => {
    await page.emulateMedia({ colorScheme, reducedMotion: "reduce" });
    await page.goto("/peta");
    await expect(placeList(page)).toBeVisible();
    expect(await blockingViolations(page)).toEqual([]);
  });
}

for (const viewport of [
  { width: 320, height: 568 },
  { width: 667, height: 375 },
  { width: 915, height: 412 },
]) {
  test(`with no places at all the panel says so where it can be seen (${viewport.width}×${viewport.height})`, async ({ browser }, testInfo) => {
    test.skip(testInfo.project.name !== "ponsel", "Ukuran layar ditentukan tes ini sendiri");
    const context = await browser.newContext({ viewport, reducedMotion: "reduce", extraHTTPHeaders: { "x-forwarded-for": NO_PLACES_IP } });
    const page = await context.newPage();
    await stubMapbox(page);
    await page.goto("/peta");
    // Tanpa filter: "belum ada lokasi", bukan "tidak ada yang cocok" atau "0 dari 0", sebelum dan sesudah peta dimuat.
    const status = page.locator("#judul-daftar-peta + [role=status]");
    await expect(status).toHaveText("Belum ada lokasi");
    await expect(page.getByText("Memuat peta…")).toHaveCount(0);
    await expect(status).toHaveText("Belum ada lokasi");
    await expect(page.locator("#judul-daftar-peta")).toHaveText("Daftar lokasi");
    await expect.poll(() => status.evaluate(uncovered)).toBe(true);
    await expect(page.getByText(/dari 0 lokasi|Tidak ada lokasi yang cocok/)).toHaveCount(0);
    // Di ponsel landscape isi panel yang tetap ini hanya beberapa piksel; kepalanya yang membawa pesan.
    const roomy = viewport.height >= 500 || viewport.width >= 768;
    const body = page.getByText("Lokasi tampil di sini setelah laporan warga diperiksa tim.");
    if (roomy) await expect.poll(() => body.evaluate(uncovered)).toBe(true);
    // Dengan filter: pesan "tidak ada yang cocok" dan jalan untuk menghapus filter.
    await page.goto("/peta?q=tidak-ada");
    await expect(status).toHaveText("Tidak ada lokasi yang cocok");
    await expect.poll(() => status.evaluate(uncovered)).toBe(true);
    const reset = page.getByRole("main").getByRole("link", { name: "Hapus filter" });
    if (roomy) await expect.poll(() => reset.evaluate(uncovered)).toBe(true);
    await context.close();
  });
}
