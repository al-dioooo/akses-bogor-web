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

test("puts a change report next to the current place data, with the private photo (FR-31)", async ({ page }) => {
  await signIn(page, email("verifikator"));
  await page.goto("/verifikasi");
  await page.getByRole("link", { name: /Halte contoh/ }).first().click();
  await expect(page.getByRole("heading", { level: 1, name: "Halte contoh" })).toBeVisible();
  const lift = page.getByRole("region", { name: "Lift / Elevator" });
  await expect(lift).toContainText("Saat ini");
  await expect(lift).toContainText("Berubah");
  await expect(lift).toContainText("Tidak tersedia · Rusak");
  const photo = page.getByRole("region", { name: /Foto/ }).getByRole("img");
  await expect(photo).toHaveAttribute("src", /\/verifikasi\/foto\/[0-9a-f-]+\?versi=asli/);
  await expect.poll(() => photo.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);

  await page.goto("/verifikasi/laporan/10000000-0000-4000-8000-000000000004");
  await expect(page.getByRole("heading", { name: "Ini laporan Anda sendiri" })).toBeVisible();
});

test("shows the open clarification question on a report waiting for an answer", async ({ page }) => {
  await signIn(page, email("verifikator"));
  await page.goto("/verifikasi/jawaban");
  await page.getByRole("link", { name: /Kampus contoh B/ }).click();
  const thread = page.getByRole("region", { name: "Klarifikasi" });
  await expect(thread).toContainText("Apakah lift sudah diperbaiki?");
  await expect(thread).toContainText("Belum dijawab. Tenggat 12 November 2026");
  await expect(page.getByRole("region", { name: "Foto" })).toContainText("Laporan ini tanpa foto");
});

test("loads unpublished report photos through the web server", async ({ page }) => {
  await signIn(page, email("verifikator"));
  await page.goto("/verifikasi/laporan/10000000-0000-4000-8000-000000000001");
  const photos = page.getByRole("region", { name: "Foto" });
  await expect(photos).toContainText("2 foto");
  await expect(photos).toContainText("Ramp dari parkir");
  const first = photos.getByRole("img").first();
  await expect(first).toHaveAttribute("src", /^\/verifikasi\/foto\/[0-9a-f-]+\?versi=asli$/);
  await expect.poll(() => first.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
  const response = await page.request.get((await first.getAttribute("src"))!);
  expect(response.headers()["cache-control"]).toBe("private, no-store");
});

const REVIEW = "/verifikasi/laporan/10000000-0000-4000-8000-000000000001";

for (const path of ["/verifikasi", "/verifikasi/jawaban", "/verifikasi/cek-ulang", REVIEW]) {
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
