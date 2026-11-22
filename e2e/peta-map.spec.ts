import type { Page } from "@playwright/test";
import { blockingViolations } from "./axe";
import { expect, test } from "./mapbox";

// Peta Mapbox dengan gaya tiruan (e2e/mapbox.ts) dan 7 lokasi dari API tiruan. Gerak dikurangi supaya perpindahan
// peta selesai seketika.
const count = (page: Page) => page.getByRole("status").filter({ hasText: /^\d+ dari \d+ lokasi$/ });
const placeList = (page: Page, name: string) => page.getByRole("list", { name });

const hasWebGL = (page: Page) => page.evaluate(() => !!document.createElement("canvas").getContext("webgl"));

test.describe("with WebGL", () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/peta");
    test.skip(!(await hasWebGL(page)), "WebGL tidak tersedia di browser ini");
    await expect(page.getByRole("group", { name: "Kontrol peta" })).toBeVisible({ timeout: 15_000 });
  });

  test("starts on Kota Bogor with one marker per place, named with its status", async ({ page }) => {
    await expect(page.locator(".mapboxgl-marker")).toHaveCount(7);
    await expect(page.getByRole("button", { name: "Halte contoh, Halte, Sebagian" })).toBeVisible();
    await expect(count(page)).toHaveText("7 dari 7 lokasi");
  });

  test("a marker opens a summary that links to the place and closes with Escape", async ({ page }) => {
    const marker = page.getByRole("button", { name: "Halte contoh, Halte, Sebagian" });
    await marker.click();
    await expect(marker).toHaveAttribute("aria-expanded", "true");
    const summary = page.getByRole("region", { name: "Halte contoh" });
    await expect(summary.getByRole("heading", { name: "Halte contoh" })).toBeFocused();
    await expect(summary.getByText("Sebagian", { exact: true })).toBeVisible();
    await expect(summary.getByRole("link", { name: "Lihat detail lokasi" })).toHaveAttribute(
      "href",
      "/lokasi/4037ba19-b366-45bc-aceb-270944fe9372",
    );
    await page.keyboard.press("Escape");
    await expect(summary).toHaveCount(0);
    await expect(marker).toBeFocused();
  });

  test("markers are reached with Tab from the map, north to south", async ({ page }) => {
    await page.getByRole("region", { name: "Peta lokasi Kota Bogor" }).focus();
    await page.keyboard.press("Tab");
    await expect(page.getByRole("button", { name: "Halte contoh B, Halte, Belum diketahui" })).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(page.getByRole("button", { name: "Kampus contoh A, Kampus, Aksesibel" })).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("heading", { name: "Kampus contoh A", level: 3 })).toBeFocused();
  });

  test("the list follows the view, and the reset button returns to Kota Bogor", async ({ page }) => {
    await page.getByRole("button", { name: "Tampilkan daftar" }).click();
    await page.getByRole("button", { name: "Tunjukkan di peta: Halte contoh", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Halte contoh", level: 3 })).toBeFocused();
    await expect(count(page)).toHaveText("1 dari 7 lokasi");
    // Marker di luar tampilan tidak bisa dicapai dengan Tab.
    await expect(page.getByRole("button", { name: /^Masjid contoh B,/ })).toHaveCount(0);
    await page.getByRole("button", { name: "Tampilkan seluruh Kota Bogor" }).click();
    await expect(count(page)).toHaveText("7 dari 7 lokasi");
  });

  test("a marker moved under the map controls leaves the Tab order, and visible markers are never covered", async ({ page }) => {
    // Diperbesar dulu, supaya batas geser Kota Bogor tidak menahan peta.
    await page.getByRole("button", { name: "Perbesar peta" }).click();
    await page.getByRole("button", { name: "Perbesar peta" }).click();
    const marker = page.locator(".mapboxgl-marker[tabindex='0']").first();
    const name = (await marker.getAttribute("aria-label"))!;
    const from = (await marker.boundingBox())!;
    const to = (await page.getByRole("group", { name: "Kontrol peta" }).boundingBox())!;
    // Peta digeser dengan tetikus dari titik kosong di peta, sampai pusat marker ada di bawah kontrol peta.
    const start = await page.evaluate(() => {
      const canvas = document.querySelector(".mapboxgl-canvas")!;
      const box = canvas.getBoundingClientRect();
      for (let y = box.top + 20; y < box.bottom; y += 10) {
        for (let x = box.left + 20; x < box.right; x += 10) {
          if (document.elementFromPoint(x, y) === canvas) return { x, y };
        }
      }
      throw new Error("tidak ada bagian peta yang terbuka");
    });
    const dx = to.x + to.width / 2 - (from.x + from.width / 2);
    const dy = to.y + to.height / 2 - (from.y + from.height / 2);
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.mouse.move(start.x + dx, start.y + dy, { steps: 20 });
    await page.waitForTimeout(300);
    await page.mouse.up();
    const moved = page.locator(`.mapboxgl-marker[aria-label="${name}"]`);
    await expect(moved).toHaveAttribute("tabindex", "-1");
    await expect(moved).toHaveAttribute("aria-hidden", "true");
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

  test("zoom buttons change the zoom", async ({ page }) => {
    await page.getByRole("button", { name: "Perbesar peta" }).click();
    await page.getByRole("button", { name: "Perbesar peta" }).click();
    await page.getByRole("button", { name: "Perbesar peta" }).click();
    await expect(count(page)).not.toHaveText("7 dari 7 lokasi");
    for (let i = 0; i < 3; i++) await page.getByRole("button", { name: "Perkecil peta" }).click();
    await expect(count(page)).toHaveText("7 dari 7 lokasi");
  });

  test("changing filters keeps the same map and swaps its markers", async ({ page }) => {
    await page.locator(".mapboxgl-canvas").evaluate((canvas) => {
      canvas.dataset.tanda = "peta-awal";
    });
    await page.getByRole("checkbox", { name: "Masjid" }).check();
    await expect(page.locator(".mapboxgl-marker")).toHaveCount(2);
    await expect(count(page)).toHaveText("2 dari 2 lokasi");
    await expect(page.locator(".mapboxgl-canvas")).toHaveAttribute("data-tanda", "peta-awal");
    await page.getByRole("checkbox", { name: "Masjid" }).uncheck();
    await expect(page.locator(".mapboxgl-marker")).toHaveCount(7);
    await expect(page.locator(".mapboxgl-canvas")).toHaveCount(1);
    await expect(page.locator(".mapboxgl-canvas")).toHaveAttribute("data-tanda", "peta-awal");
  });

  for (const colorScheme of ["light", "dark"] as const) {
    test(`the map with an open summary has no serious WCAG 2.2 AA violations (${colorScheme})`, async ({ page }) => {
      await page.emulateMedia({ colorScheme });
      await page.getByRole("button", { name: "Halte contoh, Halte, Sebagian" }).click();
      await expect(page.getByRole("heading", { name: "Halte contoh", level: 3 })).toBeFocused();
      expect(await blockingViolations(page)).toEqual([]);
    });
  }
});

test("without WebGL the page points to the list and keeps every place", async ({ page }) => {
  await page.addInitScript(() => {
    const getContext = HTMLCanvasElement.prototype.getContext;
    Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
      value(this: HTMLCanvasElement, type: string, ...rest: unknown[]) {
        return type.startsWith("webgl") ? null : Reflect.apply(getContext, this, [type, ...rest]);
      },
    });
  });
  await page.goto("/peta?category=masjid");
  await expect(page.getByRole("alert").filter({ hasText: "Peta tidak bisa tampil di browser ini" })).toBeVisible();
  await expect(page.getByRole("alert").getByRole("link", { name: "Lihat sebagai daftar" })).toHaveAttribute(
    "href",
    "/jelajahi?category=masjid",
  );
  await expect(placeList(page, "Daftar lokasi").getByRole("listitem")).toHaveCount(2);
});

test("when the map token is missing the page offers a retry and keeps the list", async ({ page }) => {
  await page.route("**/peta/kunci", (route) => route.fulfill({ status: 503, json: { galat: "peta_belum_diatur" } }));
  await page.goto("/peta");
  test.skip(!(await hasWebGL(page)), "WebGL tidak tersedia di browser ini");
  await expect(page.getByRole("alert").filter({ hasText: "Peta belum bisa dimuat" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Coba lagi" })).toBeVisible();
  await expect(placeList(page, "Daftar lokasi").getByRole("listitem")).toHaveCount(7);
});
