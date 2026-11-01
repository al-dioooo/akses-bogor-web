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
