import { expect, test, type Page } from "@playwright/test";

// Warna yang dipakai token dibaca lewat properti nyata, jadi hasilnya rgb() terlepas dari cara CSS diminify.
const resolve = (page: Page, token: string) =>
  page.evaluate((name) => {
    const probe = document.createElement("div");
    probe.style.color = `var(${name})`;
    document.body.append(probe);
    const color = getComputedStyle(probe).color;
    probe.remove();
    return color;
  }, token);

const INK_900 = "rgb(30, 32, 41)";
const INK_50 = "rgb(245, 246, 251)";
const INK_0 = "rgb(255, 255, 255)";
const VIOLET_50 = "rgb(244, 241, 255)";
const AURORA_NIGHT = "rgb(15, 12, 31)";

test("Glass is the default mode", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/");
  expect(await resolve(page, "--color-bg-canvas")).toBe(VIOLET_50);
  expect(await resolve(page, "--color-text-primary")).toBe(INK_900);
});

test("Dark follows prefers-color-scheme", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/");
  expect(await resolve(page, "--color-bg-canvas")).toBe(AURORA_NIGHT);
  expect(await resolve(page, "--color-text-primary")).toBe(INK_50);
});

test("data-theme overrides the system preference", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/");
  await page.evaluate(() => document.documentElement.setAttribute("data-theme", "solid"));
  expect(await resolve(page, "--color-surface-glass")).toBe(INK_0);
  expect(await resolve(page, "--color-bg-canvas")).toBe(INK_50);
  await page.evaluate(() => document.documentElement.setAttribute("data-theme", "glass"));
  expect(await resolve(page, "--color-text-primary")).toBe(INK_900);
});
