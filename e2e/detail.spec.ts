import { expect, test } from "@playwright/test";

// Data dari API tiruan (e2e/mock-api): Kampus contoh B berstatus Sebagian, Halte contoh B perlu dicek ulang.
const KAMPUS_B = "/lokasi/b3e865a0-3b4a-4ab0-a42e-65fea37bd33e";
const HALTE_B = "/lokasi/f2aeb27d-5f54-42f8-8368-780b6d62b51c";

test("shows the status with its reason and the facility count", async ({ page }) => {
  await page.goto(KAMPUS_B);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Kampus contoh B");
  const summary = page.getByRole("region", { name: "Ringkasan fasilitas" });
  await expect(summary).toContainText("2 dari 4 fasilitas tersedia");
  await expect(summary).toContainText("Sebagian: Toilet Difabel tidak tersedia (rusak) dan Guiding Block belum diketahui");
});

test("lists the facilities in route order with their answers", async ({ page }) => {
  await page.goto(KAMPUS_B);
  const facilities = page.getByRole("region", { name: "Fasilitas" }).getByRole("listitem");
  await expect(facilities.getByRole("heading")).toHaveText(["Guiding Block", "Ramp / Jalur Landai", "Toilet Difabel", "Lift / Elevator"]);
  await expect(facilities.nth(2)).toContainText("Tidak tersedia");
  await expect(facilities.nth(2)).toContainText("Rusak · Rusak sejak awal Oktober 2026");
});

test("warns when the data needs a recheck", async ({ page }) => {
  await page.goto(HALTE_B);
  await expect(page.getByText("Perlu dicek ulang")).toBeVisible();
});

test("an unknown place shows the not-found page", async ({ page }) => {
  await page.goto("/lokasi/00000000-0000-4000-8000-000000000000");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Lokasi ini tidak ada.");
  await expect(page.getByRole("link", { name: "Jelajahi lokasi lain" })).toHaveAttribute("href", "/jelajahi");
});
