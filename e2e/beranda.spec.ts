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
