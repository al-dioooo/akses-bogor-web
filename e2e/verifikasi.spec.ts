import { expect, test } from "@playwright/test";
import { signIn, uniqueEmail } from "./akun-masuk";
import { blockingViolations } from "./axe";
import { stubGoogle } from "./google";

// Panel verifikator (FR-30 sampai FR-38, ADR-0035) dengan API tiruan. Setiap verifikator punya antrean tiruannya sendiri.
const email = (prefix: string) => uniqueEmail(prefix, test.info().project.name);

test.beforeEach(async ({ page }) => {
  await stubGoogle(page);
});

test("shows the queue oldest first without the verifier's own report", async ({ page }) => {
  await signIn(page, email("verifikator"));
  await page.goto("/akun");
  await page.getByRole("link", { name: "Buka meja verifikasi" }).click();
  await expect(page).toHaveURL(/\/verifikasi$/);
  const main = page.getByRole("main");
  const queue = main.getByRole("region", { name: "2 laporan" });
  const tickets = queue.getByRole("listitem");
  await expect(tickets.nth(0)).toContainText("Masjid Jami contoh");
  await expect(tickets.nth(0)).toContainText("Lewat target 3 hari kerja");
  await expect(tickets.nth(1)).toContainText("Halte contoh");
  await expect(tickets.nth(1)).toContainText("Memperburuk data");
  await expect(main).not.toContainText("Laporan saya sendiri");
  await expect(main.getByRole("link", { name: "Antrean" })).toHaveAttribute("aria-current", "page");

  await main.getByRole("link", { name: "Menunggu jawaban" }).click();
  const waiting = main.getByRole("region", { name: "1 laporan" }).getByRole("listitem");
  await expect(waiting.first()).toContainText("Kampus contoh B");
  await expect(waiting.first()).toContainText("Jawaban paling lambat 12 November 2026");

  await main.getByRole("link", { name: "Perlu dicek ulang" }).click();
  await expect(main.getByRole("link", { name: /Halte contoh B/ })).toHaveAttribute("href", /\/lokasi\//);
  await expect(main.getByRole("link", { name: "Tim verifikator" })).toHaveCount(0);
});

test("tells reporters that the desk is for verifiers only", async ({ page }) => {
  await signIn(page, email("lama"));
  await page.goto("/verifikasi");
  await expect(page.getByRole("heading", { name: "Halaman ini khusus verifikator" })).toBeVisible();
  await expect(page.getByRole("main")).not.toContainText("Masjid Jami contoh");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex, nofollow");
});

for (const path of ["/verifikasi", "/verifikasi/jawaban", "/verifikasi/cek-ulang"]) {
  for (const colorScheme of ["light", "dark"] as const) {
    test(`${path} (${colorScheme}) has no serious or critical WCAG 2.2 AA violations`, async ({ page }) => {
      await signIn(page, email("verifikator"));
      await page.emulateMedia({ colorScheme, reducedMotion: "reduce" });
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 2 }).first()).toBeVisible();
      expect(await blockingViolations(page)).toEqual([]);
    });
  }
}
