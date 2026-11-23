import { expect, test } from "@playwright/test";
import { blockingViolations } from "./axe";

// Label publik tempat yang diterbitkan langsung oleh admin (ADR-0050). Di API tiruan, Masjid contoh A berlabel admin dan
// tempat lain diverifikasi tim.
const MASJID_A = "/lokasi/e553b67f-7583-4831-9dbb-29639159517f";
const HALTE = "/lokasi/4037ba19-b366-45bc-aceb-270944fe9372";

test("says on Detail that an admin published the place directly, never that it was verified", async ({ page }) => {
  await page.goto(MASJID_A);
  const summary = page.getByRole("region", { name: "Ringkasan fasilitas" });
  await expect(summary.getByText(/^Diterbitkan langsung oleh admin · \d+ \w+ \d{4}$/)).toBeVisible();
  await expect(summary).toContainText("Data ini diisi admin AksesBogor tanpa pemeriksaan verifikator kedua.");
  await expect(summary).not.toContainText("diverifikasi");
  await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", /Diterbitkan langsung oleh admin \d+ \w+ \d{4}\.$/);

  await page.goto(HALTE);
  await expect(page.getByRole("region", { name: "Ringkasan fasilitas" }).getByText(/^Terakhir diverifikasi /)).toBeVisible();
});

test("labels the admin place in Jelajahi and keeps the verified date on the others", async ({ page }) => {
  await page.goto("/jelajahi");
  const masjid = page.getByRole("article").filter({ has: page.getByRole("heading", { name: "Masjid contoh A" }) });
  await expect(masjid).toContainText(/Diterbitkan langsung oleh admin · \d+ \w+ \d{4}/);
  await expect(masjid).not.toContainText("Diverifikasi");
  const halte = page.getByRole("article").filter({ has: page.getByRole("heading", { name: "Halte contoh", exact: true }) });
  await expect(halte).toContainText(/Diverifikasi \d+ \w+ \d{4}/);
});

for (const colorScheme of ["light", "dark"] as const) {
  test(`Detail of an admin place (${colorScheme}) has no serious or critical WCAG 2.2 AA violations`, async ({ page }) => {
    await page.emulateMedia({ colorScheme, reducedMotion: "reduce" });
    await page.goto(MASJID_A);
    await expect(page.getByText("Data ini diisi admin AksesBogor tanpa pemeriksaan verifikator kedua.")).toBeVisible();
    expect(await blockingViolations(page)).toEqual([]);
  });
}
