import { expect, test } from "@playwright/test";

// Angka berasal dari API tiruan (e2e/mock-api): 7 lokasi, 5 dengan pintu masuk tanpa tangga, 3 kontributor.
test("stats are computed from the API", async ({ page }) => {
  await page.goto("/");
  const stats = page.getByRole("region", { name: "AksesBogor dalam angka" }).getByRole("definition");
  await expect(stats).toHaveText(["7", "5 dari 7", "3"]);
});

test("category tiles show counts and open Jelajahi with the category filter", async ({ page }) => {
  await page.goto("/");
  const kampus = page.getByRole("link", { name: /Kampus/ });
  await expect(kampus).toContainText("2 lokasi");
  await expect(kampus).toHaveAttribute("href", "/jelajahi?category=kampus");
});

test("search submits the query to Jelajahi", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("searchbox", { name: "Cari tempat" }).fill("masjid");
  await page.getByRole("button", { name: "Cari" }).click();
  await expect(page).toHaveURL(/\/jelajahi\?q=masjid$/);
});

test("the hero illustration stays still when reduced motion is requested", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("button", { name: "Hentikan gerakan" })).toHaveCount(0);
});

test("the route section shows the four close-ups when reduced motion is requested", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const stills = page.getByRole("region", { name: /Empat fasilitas/ }).locator(".route-still");
  await expect(stills).toHaveCount(4);
  await expect(stills.first()).toBeVisible();
});

test("the hero motion can be paused and resumed", async ({ page }) => {
  await page.goto("/");
  const pause = page.getByRole("button", { name: "Hentikan gerakan" });
  // Tanpa WebGL ilustrasi tampil diam dan tombolnya memang tidak ada.
  const hasMotion = await pause.waitFor({ timeout: 5000 }).then(
    () => true,
    () => false,
  );
  test.skip(!hasMotion, "WebGL tidak tersedia di browser ini");
  await pause.click();
  await page.getByRole("button", { name: "Jalankan gerakan" }).click();
  await expect(pause).toBeVisible();
});

// Pita jalan di bawah hero (issue #196): angka di tengah kolomnya, pita simetris di layar, dan mulai 1024 px setiap
// blok angka di tengah tinggi pita, menutupi marka jalan yang lewat di belakangnya.
for (const width of [320, 360, 768, 1024, 1280, 1440]) {
  test(`the road band under the hero is centred at ${width} px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    const band = page.getByRole("region", { name: "AksesBogor dalam angka" });
    await expect(band.getByRole("definition")).toHaveText(["7", "5 dari 7", "3"]);
    const layout = await band.evaluate((section) => {
      const center = (rect: DOMRect) => rect.left + rect.width / 2;
      const text = (element: Element) => {
        // Lebar teksnya sendiri, bukan lebar kotaknya.
        const range = document.createRange();
        range.selectNodeContents(element);
        return range.getBoundingClientRect();
      };
      const list = section.querySelector("dl")!.getBoundingClientRect();
      const box = section.getBoundingClientRect();
      const columns = list.width / (getComputedStyle(section.querySelector("dl")!).gridTemplateColumns.split(" ").length);
      const items = [...section.querySelectorAll("dl > div")].map((item, index) => {
        const rect = item.getBoundingClientRect();
        return {
          column: columns === list.width ? center(list) : list.left + columns * (index + 0.5),
          block: center(rect),
          term: center(text(item.querySelector("dt")!)),
          value: center(text(item.querySelector("dd")!)),
          top: rect.top,
          bottom: rect.bottom,
          background: getComputedStyle(item).backgroundColor,
        };
      });
      const line = getComputedStyle(section, "::before");
      return {
        left: list.left,
        right: document.documentElement.clientWidth - list.right,
        items,
        top: box.top,
        bottom: box.bottom,
        middle: box.top + box.height / 2,
        road: getComputedStyle(section).backgroundColor,
        line: line.content !== "none" ? line.backgroundPosition : null,
      };
    });
    expect(Math.abs(layout.left - layout.right)).toBeLessThanOrEqual(1);
    for (const item of layout.items) {
      expect(Math.abs(item.block - item.column)).toBeLessThanOrEqual(1);
      expect(Math.abs(item.value - item.column)).toBeLessThanOrEqual(1);
      expect(Math.abs(item.term - item.column)).toBeLessThanOrEqual(1);
    }
    if (width >= 1024) {
      expect(layout.line).toContain("50%");
      for (const item of layout.items) {
        // Blok angka di tengah tinggi pita dan menutupi marka dengan warna aspal.
        expect(Math.abs(item.top - layout.top - (layout.bottom - item.bottom))).toBeLessThanOrEqual(1);
        expect(item.top).toBeLessThan(layout.middle);
        expect(item.bottom).toBeGreaterThan(layout.middle);
        expect(item.background).toBe(layout.road);
      }
    }
  });
}
