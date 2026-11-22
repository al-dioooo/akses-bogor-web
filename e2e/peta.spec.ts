import type { Page } from "@playwright/test";
import { expect, openList, test } from "./mapbox";

/** Jumlah lokasi di kepala panel: "Menampilkan N lokasi" sebelum peta siap, "X dari N lokasi" sesudahnya. */
const total = (page: Page, count: number) =>
  expect(page.getByRole("status").filter({ hasText: new RegExp(`^(Menampilkan ${count} lokasi|\\d+ dari ${count} lokasi)$`) })).toBeVisible();
const placeList = (page: Page) => page.getByRole("list", { name: /^(Daftar lokasi|Lokasi di tampilan peta)$/ });

// Data dari API tiruan (e2e/mock-api): 7 lokasi contoh dengan keempat status.
test("lists every place on the map page with its status", async ({ page }) => {
  await page.goto("/peta");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Lokasi di peta.");
  await total(page, 7);
  // Judulnya "Lokasi di tampilan peta" setelah peta siap, atau "Daftar lokasi" tanpa WebGL.
  await openList(page);
  const list = placeList(page);
  await expect(list.getByRole("listitem")).toHaveCount(7);
  await expect(list.getByRole("link", { name: "Kampus contoh A" })).toHaveAttribute("href", /^\/lokasi\/[0-9a-f-]{36}$/);
});

test("the legend names every status in text", async ({ page }) => {
  await page.goto("/peta");
  await openList(page);
  await expect(page.getByRole("region", { name: "Legenda status" }).getByRole("listitem")).toHaveText([
    "Aksesibel",
    "Sebagian",
    "Tidak aksesibel",
    "Belum diketahui",
  ]);
});

test("filters submit to the map page and carry over to the list view", async ({ page }) => {
  await page.goto("/peta");
  // Chip kategori langsung diterapkan.
  await page.getByRole("checkbox", { name: "Masjid" }).check();
  await expect(page).toHaveURL(/\/peta\?category=masjid$/);
  await total(page, 2);
  await page.getByRole("button", { name: "Filter", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Filter lokasi" });
  await expect(dialog.getByRole("heading", { name: "Filter lokasi" })).toBeFocused();
  await dialog.getByRole("checkbox", { name: "Tidak aksesibel" }).check();
  await dialog.getByRole("button", { name: "Terapkan filter" }).click();
  await expect(dialog).toBeHidden();
  await expect(page).toHaveURL(/\/peta\?.*category=masjid.*status=tidak_aksesibel/);
  await total(page, 1);
  await expect(page.getByRole("button", { name: "Filter 1 aktif" })).toBeVisible();
  await openList(page);
  await page.getByRole("link", { name: "Lihat sebagai daftar" }).click();
  await expect(page).toHaveURL(/\/jelajahi\?category=masjid&status=tidak_aksesibel$/);
  await expect(page.getByRole("heading", { name: "Masjid contoh B" })).toBeVisible();
});

test("the filter popover closes with Escape and clears every filter", async ({ page }) => {
  await page.goto("/peta?q=halte&status=sebagian");
  await expect(page.getByRole("searchbox", { name: "Cari nama tempat" })).toHaveValue("halte");
  const button = page.getByRole("button", { name: "Filter 1 aktif" });
  await button.click();
  const dialog = page.getByRole("dialog", { name: "Filter lokasi" });
  await expect(dialog.getByRole("checkbox", { name: "Sebagian" })).toBeChecked();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(button).toBeFocused();
  await button.click();
  await dialog.getByRole("link", { name: "Hapus filter" }).click();
  await expect(page).toHaveURL(/\/peta$/);
  await expect(page.getByRole("searchbox", { name: "Cari nama tempat" })).toHaveValue("");
  await total(page, 7);
});

test("the search field submits with Enter and Back restores the earlier filters", async ({ page }) => {
  await page.goto("/peta?category=kampus");
  const search = page.getByRole("searchbox", { name: "Cari nama tempat" });
  await search.fill("contoh A");
  await search.press("Enter");
  await expect(page).toHaveURL(/\/peta\?q=contoh\+A&category=kampus$/);
  await total(page, 1);
  await page.goBack();
  await expect(page).toHaveURL(/\/peta\?category=kampus$/);
  await expect(page.getByRole("checkbox", { name: "Kampus" })).toBeChecked();
  await expect(search).toHaveValue("");
});

test("the list view links back to the map with the same filters", async ({ page }) => {
  await page.goto("/jelajahi?q=halte&halaman=1");
  await expect(page.getByRole("link", { name: "Lihat di peta" })).toHaveAttribute("href", "/peta?q=halte");
});

test("an empty result explains itself and offers to clear the filters", async ({ page }) => {
  await page.goto("/peta?q=tidak-ada-yang-cocok");
  await expect(page.getByText("Tidak ada lokasi yang cocok", { exact: true }).first()).toBeVisible();
  await openList(page);
  await page.getByRole("main").getByRole("link", { name: "Hapus filter" }).last().click();
  await expect(page).toHaveURL(/\/peta$/);
});

test("an API error shows a message with a retry button", async ({ page }) => {
  await page.goto("/peta?q=galat-tiruan");
  await expect(page.getByRole("alert").filter({ hasText: "Data belum bisa dimuat" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Coba lagi" })).toBeVisible();
});
