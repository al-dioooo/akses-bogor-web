import { expect, test } from "@playwright/test";

// Data dari API tiruan (e2e/mock-api): 7 lokasi contoh dengan keempat status.
test("lists every place with a count that matches the cards", async ({ page }) => {
  await page.goto("/jelajahi");
  await expect(page.getByRole("status")).toHaveText("Menampilkan 1–7 dari 7 lokasi");
  await expect(page.getByRole("article")).toHaveCount(7);
});

test("search matches part of a name", async ({ page }) => {
  await page.goto("/jelajahi?q=masjid");
  await expect(page.getByRole("article")).toHaveCount(2);
});

test("filters combine through the form and stay selected", async ({ page }) => {
  await page.goto("/jelajahi");
  await page.getByRole("checkbox", { name: "Masjid" }).check();
  await page.getByText("Filter", { exact: true }).click();
  await page.getByRole("checkbox", { name: "Tidak aksesibel" }).check();
  await page.getByRole("button", { name: "Terapkan filter" }).click();
  await expect(page).toHaveURL(/category=masjid.*status=tidak_aksesibel/);
  await expect(page.getByRole("status")).toHaveText("Menampilkan 1–1 dari 1 lokasi");
  await expect(page.getByRole("heading", { name: "Masjid contoh B" })).toBeVisible();
  await expect(page.getByRole("checkbox", { name: "Masjid" })).toBeChecked();
});

test("cards link to the place detail", async ({ page }) => {
  await page.goto("/jelajahi?q=kampus contoh a");
  await expect(page.getByRole("link", { name: "Kampus contoh A" })).toHaveAttribute("href", /^\/lokasi\/[0-9a-f-]{36}$/);
});

test("an empty result explains itself and offers to clear the filters", async ({ page }) => {
  await page.goto("/jelajahi?q=tidak-ada-yang-cocok");
  await expect(page.getByRole("heading", { name: "Tidak ada lokasi yang cocok" })).toBeVisible();
  await page.getByRole("main").getByRole("link", { name: "Hapus filter" }).click();
  await expect(page).toHaveURL(/\/jelajahi$/);
});

test("an API error shows a message with a retry button", async ({ page }) => {
  await page.goto("/jelajahi?q=galat-tiruan");
  await expect(page.getByRole("alert").filter({ hasText: "Data belum bisa dimuat" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Coba lagi" })).toBeVisible();
});
