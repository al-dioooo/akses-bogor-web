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

const INK_950 = "rgb(18, 19, 26)";
const INK_50 = "rgb(245, 246, 251)";
const PAPER_50 = "rgb(249, 249, 247)";

test("Terang is the default mode", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/");
  expect(await resolve(page, "--color-bg-canvas")).toBe(PAPER_50);
  expect(await resolve(page, "--color-text-primary")).toBe(INK_950);
});

test("Gelap follows prefers-color-scheme", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/");
  expect(await resolve(page, "--color-bg-canvas")).toBe(INK_950);
  expect(await resolve(page, "--color-text-primary")).toBe(INK_50);
});

test("data-theme overrides the system preference", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/");
  await page.evaluate(() => document.documentElement.setAttribute("data-theme", "terang"));
  expect(await resolve(page, "--color-bg-canvas")).toBe(PAPER_50);
  await page.emulateMedia({ colorScheme: "light" });
  await page.evaluate(() => document.documentElement.setAttribute("data-theme", "gelap"));
  expect(await resolve(page, "--color-text-primary")).toBe(INK_50);
});
