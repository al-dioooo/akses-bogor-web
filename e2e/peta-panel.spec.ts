import type { Page } from "@playwright/test";
import { blockingViolations } from "./axe";
import { expect, test } from "./mapbox";

// Peta layar penuh: panel daftar (lembar bawah di ponsel, panel samping mulai 768 px), dengan API dan Mapbox tiruan.
const placeList = (page: Page) => page.getByRole("list", { name: /^(Daftar lokasi|Lokasi di tampilan peta)$/ });

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
    await page.getByRole("button", { name: "Tampilkan daftar" }).click();
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
  const toggle = page.getByRole("button", { name: "Tampilkan daftar" });
  await expect(placeList(page)).toBeHidden();
  await toggle.click();
  await expect(placeList(page).getByRole("listitem")).toHaveCount(7);
  await placeList(page).getByRole("link").first().focus();
  await page.keyboard.press("Escape");
  await expect(placeList(page)).toBeHidden();
  await expect(page.getByRole("button", { name: "Tampilkan daftar" })).toBeFocused();
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
    await page.getByRole("button", { name: "Tampilkan daftar" }).click();
    await expect(placeList(page)).toBeVisible();
    expect(await blockingViolations(page)).toEqual([]);
  });
}
