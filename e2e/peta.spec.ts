import { expect, test } from "@playwright/test";

// Data dari API tiruan (e2e/mock-api): 7 lokasi contoh dengan keempat status.
test("lists every place on the map page with its status", async ({ page }) => {
  await page.goto("/peta");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Lokasi di peta.");
  await expect(page.getByRole("status").filter({ hasText: "lokasi" })).toHaveText("Menampilkan 7 lokasi");
  const list = page.getByRole("region", { name: "Daftar lokasi" });
  await expect(list.getByRole("listitem")).toHaveCount(7);
  await expect(list.getByRole("link", { name: "Kampus contoh A" })).toHaveAttribute("href", /^\/lokasi\/[0-9a-f-]{36}$/);
});

test("the legend names every status in text", async ({ page }) => {
  await page.goto("/peta");
  await expect(page.getByRole("region", { name: "Legenda status" }).getByRole("listitem")).toHaveText([
    "Aksesibel",
    "Sebagian",
    "Tidak aksesibel",
    "Belum diketahui",
  ]);
});

test("filters submit to the map page and carry over to the list view", async ({ page }) => {
  await page.goto("/peta");
  await page.getByRole("checkbox", { name: "Masjid" }).check();
  await page.getByText("Filter", { exact: true }).click();
  await page.getByRole("checkbox", { name: "Tidak aksesibel" }).check();
  await page.getByRole("button", { name: "Terapkan filter" }).click();
  await expect(page).toHaveURL(/\/peta\?.*category=masjid.*status=tidak_aksesibel/);
  await expect(page.getByRole("status").filter({ hasText: "lokasi" })).toHaveText("Menampilkan 1 lokasi");
  await page.getByRole("link", { name: "Lihat sebagai daftar" }).click();
  await expect(page).toHaveURL(/\/jelajahi\?category=masjid&status=tidak_aksesibel$/);
  await expect(page.getByRole("heading", { name: "Masjid contoh B" })).toBeVisible();
});

test("the list view links back to the map with the same filters", async ({ page }) => {
  await page.goto("/jelajahi?q=halte&halaman=1");
  await expect(page.getByRole("link", { name: "Lihat di peta" })).toHaveAttribute("href", "/peta?q=halte");
});

test("an empty result explains itself and offers to clear the filters", async ({ page }) => {
  await page.goto("/peta?q=tidak-ada-yang-cocok");
  await expect(page.getByText("Tidak ada lokasi yang cocok", { exact: true }).first()).toBeVisible();
  await page.getByRole("main").getByRole("link", { name: "Hapus filter" }).last().click();
  await expect(page).toHaveURL(/\/peta$/);
});

test("an API error shows a message with a retry button", async ({ page }) => {
  await page.goto("/peta?q=galat-tiruan");
  await expect(page.getByRole("alert").filter({ hasText: "Data belum bisa dimuat" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Coba lagi" })).toBeVisible();
});
