import { expect, test } from "@playwright/test";
import { signIn, uniqueEmail } from "./akun-masuk";
import { blockingViolations } from "./axe";
import { dashboardMenu } from "./dasbor";
import { stubGoogle } from "./google";

// Kelola tempat untuk admin (ADR-0051) dengan API tiruan (e2e/mock-api/kelola-tempat.mjs). Masjid contoh A di data contoh
// berlabel admin; tempat lain diperiksa tim.
const email = (prefix: string) => uniqueEmail(prefix, test.info().project.name);
const PAGE = "/verifikasi/tempat";

test.beforeEach(async ({ page }) => {
  await stubGoogle(page);
});

test("admins open Kelola tempat from the menu and see every place with its origin and state", async ({ page }) => {
  await signIn(page, email("admin"));
  await (await dashboardMenu(page)).getByRole("link", { name: "Kelola tempat" }).click();
  await expect(page).toHaveURL(PAGE);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Kelola tempat.");
  await expect((await dashboardMenu(page)).getByRole("link", { name: "Kelola tempat" })).toHaveAttribute("aria-current", "page");
  const results = page.getByRole("region", { name: /\d+ tempat/ });
  const masjid = results.getByRole("listitem").filter({ hasText: "Masjid contoh A" });
  await expect(masjid).toContainText("Langsung oleh admin");
  await expect(masjid).toContainText("Tayang");
  await expect(masjid.getByRole("link", { name: "Masjid contoh A" })).toHaveAttribute("href", /\/verifikasi\/tempat\/e553b67f-/);
  await expect(results.getByRole("listitem").filter({ hasText: "Halte contoh B" })).toContainText("Diperiksa tim");
});

test("filters by origin and name through the address, and explains an empty result", async ({ page }) => {
  await signIn(page, email("admin"));
  await page.goto(PAGE);
  const filters = page.getByRole("search", { name: "Saring tempat" });
  await filters.getByLabel("Asal").selectOption({ label: "Langsung oleh admin" });
  await filters.getByRole("button", { name: "Terapkan" }).click();
  await expect(page).toHaveURL(/asal=admin/);
  const rows = page.getByRole("region", { name: /tempat/ }).getByRole("listitem");
  await expect(rows.filter({ hasText: "Masjid contoh A" })).toHaveCount(1);
  for (const row of await rows.all()) await expect(row).toContainText("Langsung oleh admin");

  await page.goto(`${PAGE}?q=tidak-ada-tempat-seperti-ini`);
  await expect(page.getByText("Tidak ada tempat yang cocok")).toBeVisible();
  await page.getByRole("link", { name: "Hapus saringan" }).click();
  await expect(page).toHaveURL(PAGE);
  await page.goto(`${PAGE}?halaman=99`);
  await expect(page.getByText("Halaman ini kosong.")).toBeVisible();
});

test("is hidden from verifiers and regular accounts, and the page says it is for admins", async ({ page }) => {
  await signIn(page, email("verifikator"));
  await expect((await dashboardMenu(page)).getByRole("link", { name: "Kelola tempat", includeHidden: true })).toHaveCount(0);
  await page.goto(PAGE);
  await expect(page.getByRole("main")).toContainText("Halaman ini khusus admin.");
  await expect(page.getByRole("search", { name: "Saring tempat" })).toHaveCount(0);

  await page.context().clearCookies();
  await signIn(page, email("lama"));
  await page.goto(PAGE);
  await expect(page.getByRole("heading", { name: "Halaman ini khusus verifikator" })).toBeVisible();
});

for (const colorScheme of ["light", "dark"] as const) {
  test(`Kelola tempat (${colorScheme}) has no serious or critical WCAG 2.2 AA violations`, async ({ page }) => {
    await page.emulateMedia({ colorScheme, reducedMotion: "reduce" });
    await signIn(page, email("admin"));
    await page.goto(PAGE);
    await expect(page.getByRole("region", { name: /\d+ tempat/ }).getByRole("listitem").first()).toBeVisible();
    expect(await blockingViolations(page)).toEqual([]);
  });
}
