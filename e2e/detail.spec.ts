import { expect, test } from "@playwright/test";
import { blockingViolations } from "./axe";

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

// FR-08: tanpa lembar berbagi (seperti Chrome desktop di Linux), Bagikan menyalin alamat lokasi ke clipboard.
test.describe("Bagikan", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(Navigator.prototype, "share", { value: undefined, configurable: true });
    });
  });

  test("copies the place link without extra parameters and says so", async ({ page, context, baseURL }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto(`${KAMPUS_B}?dari=peta#foto`);
    await page.getByRole("button", { name: "Bagikan" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Tautan lokasi ini sudah disalin." })).toBeVisible();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(`${baseURL}${KAMPUS_B}`);
  });

  test("shows the link to copy by hand when copying fails", async ({ page, baseURL }) => {
    await page.addInitScript(() => {
      Object.defineProperty(Navigator.prototype, "clipboard", {
        value: { writeText: () => Promise.reject(new Error("Ditolak")) },
        configurable: true,
      });
    });
    await page.goto(KAMPUS_B);
    await page.getByRole("button", { name: "Bagikan" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Tautan tidak bisa disalin otomatis." })).toBeVisible();
    const field = page.getByRole("textbox", { name: "Alamat halaman lokasi" });
    await expect(field).toHaveValue(`${baseURL}${KAMPUS_B}`);
    await expect(field).toBeFocused();
    expect(await blockingViolations(page)).toEqual([]);
  });
});
