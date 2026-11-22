import { expect, test } from "@playwright/test";
import { signIn, uniqueEmail } from "./akun-masuk";
import { blockingViolations } from "./axe";
import { stubGoogle } from "./google";

// Ringkasan dasbor di /akun (ADR-0046) dan Laporan saya yang tersaring, dengan API tiruan. Akun pelapor- punya empat
// laporan contoh, satu di antaranya menunggu jawaban dengan tenggat 5 hari lagi; akun lama- belum punya laporan.
const email = (prefix: string) => uniqueEmail(prefix, test.info().project.name);

test.beforeEach(async ({ page }) => {
  await stubGoogle(page);
});

test("greets the account and lists the clarification due, with its deadline", async ({ page }) => {
  await signIn(page, email("pelapor"));
  const main = page.getByRole("main");
  await expect(main.getByRole("heading", { level: 1 })).toHaveText("Halo, Sari.");
  const agenda = main.getByRole("region", { name: "Yang menunggu Anda" });
  const task = agenda.getByRole("link", { name: /Jawab pertanyaan verifikator/ });
  await expect(task).toContainText("Masjid Al-Contoh");
  await expect(task).toContainText("5 hari lagi");
  await task.click();
  await expect(page).toHaveURL(/\/akun\/laporan\/00000000-0000-4000-8000-000000000001$/);
});

test("counts reports per status and opens Laporan saya filtered by the chosen status", async ({ page }) => {
  await signIn(page, email("pelapor"));
  const counts = page.getByRole("list", { name: "Jumlah laporan per status" }).getByRole("link");
  await expect(counts).toHaveText([/^1\s*Diterbitkan/, /^1\s*Menunggu verifikasi/, /^1\s*Perlu klarifikasi/, /^1\s*Ditolak/]);
  await counts.filter({ hasText: "Ditolak" }).click();
  await expect(page).toHaveURL(/\/akun\/laporan\?status=ditolak$/);
  const filters = page.getByRole("navigation", { name: "Saring menurut status" });
  await expect(filters.getByRole("link", { name: /Ditolak/ })).toHaveAttribute("aria-current", "page");
  const reports = page.getByRole("region", { name: "Laporan saya" }).getByRole("listitem");
  await expect(reports).toHaveCount(1);
  await expect(reports.first()).toContainText("Alasan: Bukti tidak cukup");
  await filters.getByRole("link", { name: /Semua/ }).click();
  await expect(reports).toHaveCount(4);
});

test("tells a new account that nothing is waiting and no report is sent yet", async ({ page }) => {
  await signIn(page, email("lama"));
  const main = page.getByRole("main");
  await expect(main.getByText("Tidak ada yang menunggu Anda")).toBeVisible();
  await expect(main.getByRole("heading", { name: "Belum ada laporan" })).toBeVisible();
  await page.goto("/akun/laporan");
  await expect(page.getByRole("navigation", { name: "Saring menurut status" })).toHaveCount(0);
  await expect(main.getByRole("heading", { level: 2 })).toHaveText("Tidak ada laporan");
});

for (const colorScheme of ["light", "dark"] as const) {
  for (const prefix of ["pelapor", "lama"]) {
    test(`Ringkasan for ${prefix} (${colorScheme}) has no serious or critical WCAG 2.2 AA violations`, async ({ page }) => {
      await page.emulateMedia({ colorScheme, reducedMotion: "reduce" });
      await signIn(page, email(prefix));
      await expect(page.getByRole("region", { name: "Yang menunggu Anda" })).toBeVisible();
      await expect(page.getByRole("region", { name: "Laporan saya" })).toBeVisible();
      expect(await blockingViolations(page)).toEqual([]);
    });
  }
}
