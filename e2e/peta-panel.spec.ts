import type { Page } from "@playwright/test";
import { blockingViolations } from "./axe";
import { expect, openList, stubMapbox, test } from "./mapbox";

// Peta layar penuh: panel daftar (lembar bawah di ponsel, panel samping mulai 768 px), dengan API dan Mapbox tiruan.
const handle = (page: Page) => page.getByRole("slider", { name: "Tinggi panel daftar" });
const placeList = (page: Page) => page.getByRole("list", { name: /^(Daftar lokasi|Lokasi di tampilan peta)$/ });
const isMobile = (page: Page) => (page.viewportSize()?.width ?? 0) < 768;

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
    await openList(page);
    await expect(placeList(page)).toBeVisible();
    const sizes = await page.evaluate(() => {
      const nav = [...document.querySelectorAll("nav")].find((element) => getComputedStyle(element).position === "fixed");
      const panel = document.querySelector(".peta-lembar")!.getBoundingClientRect();
      const toggle = document.querySelector<HTMLElement>("[aria-controls='isi-lembar']")!.getBoundingClientRect();
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
    // Kepala panel (dengan tombolnya) tidak pernah tertutup Bottom nav; di layar lebar panel berhenti di atasnya.
    if (sizes.navTop !== null) expect(sizes.toggleBottom).toBeLessThanOrEqual(sizes.navTop);
    if (sizes.navTop !== null && width >= 768) expect(sizes.panelBottom).toBeLessThanOrEqual(sizes.navTop);
  });
}

test("the panel opens with its button and closes with Escape, returning focus to the button", async ({ page }) => {
  await openMap(page);
  await openList(page);
  await expect(placeList(page).getByRole("listitem")).toHaveCount(7);
  await placeList(page).getByRole("link").first().focus();
  await page.keyboard.press("Escape");
  await expect(placeList(page)).toBeHidden();
  const toggle = page.getByRole("button", { name: "Tampilkan daftar" });
  await expect(toggle).toBeFocused();
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await toggle.click();
  await expect(placeList(page)).toBeVisible();
});

test("on a wide screen the side panel starts open without moving once the page has loaded", async ({ page }) => {
  test.skip((page.viewportSize()?.width ?? 0) < 768, "Panel samping mulai 768 px");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/peta", { waitUntil: "commit" });
  // Panel pertama yang tampil (bisa panel kosong selama isi Peta masih dialirkan) sudah terbuka di tempat akhirnya.
  const first = page.locator(".peta-lembar").first();
  await first.waitFor();
  const before = await first.boundingBox();
  await expect(placeList(page)).toBeVisible();
  await expect(page.getByRole("button", { name: "Tampilkan peta" })).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator(".peta-lembar")).toHaveCount(1);
  expect(await page.locator(".peta-lembar").boundingBox()).toEqual(before);
});

test("on a phone the handle is a slider that changes the sheet height without dragging", async ({ page }) => {
  test.skip(!isMobile(page), "Pegangan hanya ada di lembar bawah ponsel");
  await openMap(page);
  await expect(handle(page)).toHaveAttribute("aria-valuetext", "kecil");
  await handle(page).click();
  await expect(handle(page)).toHaveAttribute("aria-valuetext", "setengah layar");
  await expect(placeList(page)).toBeVisible();
  await handle(page).press("ArrowUp");
  await expect(handle(page)).toHaveAttribute("aria-valuetext", "penuh");
  // Lembar penuh menutup seluruh peta.
  const box = await page.locator(".peta-lembar").boundingBox();
  const main = await page.locator("main").boundingBox();
  expect(Math.round(box!.y)).toBe(Math.round(main!.y));
  await handle(page).press("Home");
  await expect(handle(page)).toHaveAttribute("aria-valuetext", "kecil");
  await handle(page).press("End");
  await expect(handle(page)).toHaveAttribute("aria-valuetext", "penuh");
  await page.getByRole("button", { name: "Tampilkan peta" }).click();
  await expect(handle(page)).toHaveAttribute("aria-valuetext", "kecil");
});

test("on a phone the handle shows its own focus ring, inside the sheet", async ({ page }) => {
  test.skip(!isMobile(page), "Pegangan hanya ada di lembar bawah ponsel");
  await openMap(page);
  await handle(page).focus();
  // Diulang sampai lembar selesai bergerak setelah halaman dimuat.
  await expect.poll(() => handle(page).evaluate((element) => {
    const style = getComputedStyle(element);
    const grow = Number.parseFloat(style.outlineOffset) + Number.parseFloat(style.outlineWidth);
    const box = element.getBoundingClientRect();
    const sheet = element.closest(".peta-lembar")!.getBoundingClientRect();
    return {
      shown: element.matches(":focus-visible") && style.outlineStyle !== "none",
      // Lembar memotong isinya (overflow: hidden), jadi cincinnya harus seluruhnya di dalam lembar.
      inside: box.top - grow >= sheet.top && box.left - grow >= sheet.left && box.right + grow <= sheet.right,
    };
  })).toEqual({ shown: true, inside: true });
});

test("a full sheet lists every place, not only those in the map view it covers", async ({ page }) => {
  test.skip(!isMobile(page), "Lembar penuh hanya ada di ponsel");
  await openMap(page);
  await expect(page.getByRole("group", { name: "Kontrol peta" })).toBeVisible({ timeout: 15_000 });
  const status = page.locator("#judul-daftar-peta + [role=status]");
  await openList(page);
  await page.getByRole("button", { name: "Tunjukkan di peta: Halte contoh", exact: true }).click();
  await expect(page.getByRole("heading", { level: 3, name: "Halte contoh" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(status).toHaveText(/^[1-6] dari 7 lokasi$/);
  await handle(page).press("End");
  await expect(handle(page)).toHaveAttribute("aria-valuetext", "penuh");
  await expect(page.getByRole("heading", { level: 2, name: "Daftar lokasi" })).toBeVisible();
  await expect(status).toHaveText("Menampilkan 7 lokasi");
  await expect(placeList(page).getByRole("listitem")).toHaveCount(7);
  await handle(page).press("ArrowDown");
  await expect(status).toHaveText(/^[1-6] dari 7 lokasi$/);
});

test("on a phone the sheet follows a drag and settles on the nearest height", async ({ page }) => {
  test.skip(!isMobile(page), "Lembar hanya bisa ditarik di ponsel");
  await openMap(page);
  const box = (await handle(page).boundingBox())!;
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  const viewport = page.viewportSize()!;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x, y - viewport.height * 0.25, { steps: 12 });
  await page.mouse.move(x, y - viewport.height * 0.27, { steps: 20 });
  await page.mouse.up();
  await expect(handle(page)).toHaveAttribute("aria-valuetext", "setengah layar");
  // Tarikan pendek ke atas tidak sampai ke tinggi berikutnya; lembar kembali ke tinggi semula.
  const half = (await handle(page).boundingBox())!;
  await page.mouse.move(x, half.y + 10);
  await page.mouse.down();
  await page.mouse.move(x, half.y - 30, { steps: 15 });
  await page.waitForTimeout(100);
  await page.mouse.move(x, half.y - 32, { steps: 5 });
  await page.mouse.up();
  await expect(handle(page)).toHaveAttribute("aria-valuetext", "setengah layar");
  expect(await page.evaluate(() => document.querySelector("main")!.hasAttribute("data-menyeret"))).toBe(false);
});

test("a full sheet makes the map and the search under it unreachable", async ({ page }) => {
  test.skip(!isMobile(page), "Lembar penuh hanya ada di ponsel");
  await openMap(page);
  await handle(page).press("End");
  await expect(handle(page)).toHaveAttribute("aria-valuetext", "penuh");
  const inert = () => page.evaluate(() => [".peta-cari", ".peta-peta"].map((selector) => document.querySelector<HTMLElement>(selector)!.inert));
  expect(await inert()).toEqual([true, true]);
  await page.keyboard.press("Escape");
  await expect(handle(page)).toHaveAttribute("aria-valuetext", "kecil");
  expect(await inert()).toEqual([false, false]);
  await expect(page.getByRole("button", { name: "Tampilkan daftar" })).toBeFocused();
});

test("on a landscape phone the opened list covers the map and leaves nothing focusable behind it", async ({ page }) => {
  test.skip(!isMobile(page), "Lembar bawah hanya ada di ponsel");
  await page.setViewportSize({ width: 667, height: 375 });
  await openMap(page);
  await openList(page);
  const box = await page.locator(".peta-lembar").boundingBox();
  const main = await page.locator("main").boundingBox();
  expect(Math.round(box!.y)).toBe(Math.round(main!.y));
  const inert = () => page.evaluate(() => [".peta-cari", ".peta-peta"].map((selector) => document.querySelector<HTMLElement>(selector)!.inert));
  expect(await inert()).toEqual([true, true]);
  await expect(placeList(page).getByRole("listitem")).toHaveCount(7);
  await page.getByRole("button", { name: "Tampilkan peta" }).click();
  expect(await inert()).toEqual([false, false]);
});

test("closing a place card whose marker the sheet now covers moves focus to that place in the list", async ({ page }) => {
  test.skip(!isMobile(page), "Lembar bawah hanya ada di ponsel");
  await page.setViewportSize({ width: 360, height: 740 });
  await openMap(page);
  await expect(page.getByRole("group", { name: "Kontrol peta" })).toBeVisible({ timeout: 15_000 });
  await page.getByRole("button", { name: "Masjid contoh A, Masjid, Aksesibel" }).click();
  await expect(page.getByRole("heading", { level: 3, name: "Masjid contoh A" })).toBeFocused();
  // Ponsel diputar: lembar yang terbuka menjadi setinggi layar dan peta di baliknya inert, termasuk marker tadi.
  await page.setViewportSize({ width: 667, height: 375 });
  await expect.poll(() => page.evaluate(() => document.querySelector<HTMLElement>(".peta-peta")!.inert)).toBe(true);
  await page.getByRole("button", { name: "Tutup ringkasan" }).click();
  await expect(page.getByRole("button", { name: "Tunjukkan di peta: Masjid contoh A" })).toBeFocused();
});

test("on a short phone a chosen marker ends up above the opened panel", async ({ page }) => {
  test.skip((page.viewportSize()?.width ?? 0) >= 768, "Lembar bawah hanya ada di ponsel");
  await page.setViewportSize({ width: 360, height: 740 });
  await openMap(page);
  await expect(page.getByRole("group", { name: "Kontrol peta" })).toBeVisible({ timeout: 15_000 });
  const marker = page.getByRole("button", { name: "Masjid contoh A, Masjid, Aksesibel" });
  await marker.click();
  await expect(page.getByRole("heading", { level: 3, name: "Masjid contoh A" })).toBeFocused();
  // Marker yang dipilih digeser ke bagian peta di atas panel (setelah panel selesai membuka), jadi tetap terlihat dan
  // bisa difokus.
  await expect
    .poll(async () => {
      const markerBox = (await marker.boundingBox())!;
      const panelBox = (await page.locator(".peta-lembar").boundingBox())!;
      return panelBox.y - (markerBox.y + markerBox.height);
    })
    .toBeGreaterThanOrEqual(0);
  await expect(marker).not.toHaveAttribute("aria-hidden", "true");
});

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
    await openList(page);
    await expect(placeList(page)).toBeVisible();
    expect(await blockingViolations(page)).toEqual([]);
    if (isMobile(page)) {
      await handle(page).press("End");
      await expect(handle(page)).toHaveAttribute("aria-valuetext", "penuh");
      expect(await blockingViolations(page)).toEqual([]);
    }
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
    await openList(page);
    const body = page.getByText("Lokasi tampil di sini setelah laporan warga diperiksa tim.");
    await expect.poll(() => body.evaluate(uncovered)).toBe(true);
    // Dengan filter: pesan "tidak ada yang cocok" dan jalan untuk menghapus filter.
    await page.goto("/peta?q=tidak-ada");
    await expect(status).toHaveText("Tidak ada lokasi yang cocok");
    await expect.poll(() => status.evaluate(uncovered)).toBe(true);
    await openList(page);
    const reset = page.getByRole("main").getByRole("link", { name: "Hapus filter" });
    await expect.poll(() => reset.evaluate(uncovered)).toBe(true);
    await context.close();
  });
}
