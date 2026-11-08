import { expect, test } from "@playwright/test";
import { signIn, uniqueEmail } from "./akun-masuk";
import { blockingViolations } from "./axe";
import { photo } from "./foto";
import { stubGoogle } from "./google";

// Sisi pelapor untuk klarifikasi (FR-41, ADR-0036): dari Laporan saya ke halaman jawab, dengan teks dan foto.
const email = () => uniqueEmail("pelapor", test.info().project.name);

test.beforeEach(async ({ page }) => {
  await stubGoogle(page);
});

test("answers a clarification with text and a tagged photo from Laporan saya", async ({ page }) => {
  await signIn(page, email());
  await page.goto("/akun");
  await page.getByRole("link", { name: "Jawab pertanyaan" }).click();
  await expect(page).toHaveURL(/\/akun\/laporan\/00000000-0000-4000-8000-000000000001$/);
  const main = page.getByRole("main");
  await expect(main).toContainText("Apakah ramp-nya sampai ke pintu utama?");
  await expect(main).toContainText("Jawab paling lambat");
  await expect(main).toContainText("Masih bisa 8 foto.");

  await main.getByRole("button", { name: "Kirim jawaban" }).click();
  const answer = main.getByLabel("Jawaban Anda");
  await expect(answer).toBeFocused();
  await expect(main).toContainText("Tulis jawaban Anda dulu.");
  await answer.fill("Ya, ramp sampai ke pintu utama. Saya tambahkan fotonya.");

  await main.getByLabel("Tambah foto").setInputFiles([photo("ramp.png")]);
  await expect(main.getByRole("status").filter({ hasText: "ramp.png terunggah." })).toBeVisible();
  await main.getByRole("button", { name: "Kirim jawaban" }).click();
  await expect(main.getByRole("alert")).toContainText("Pilih isi untuk setiap foto.");
  await main.getByLabel("Isi foto 1").selectOption({ label: "Pintu masuk dan ramp" });
  expect(await blockingViolations(page)).toEqual([]);
  await main.getByRole("button", { name: "Kirim jawaban" }).click();

  await expect(main.getByRole("heading", { name: "Jawaban terkirim" })).toBeFocused();
  await page.goto("/akun");
  await expect(page.getByRole("link", { name: "Jawab pertanyaan" })).toHaveCount(0);
});

test("shows a report that is no longer waiting for an answer as closed", async ({ page }) => {
  await signIn(page, email());
  await page.goto("/akun/laporan/00000000-0000-4000-8000-000000000002");
  await expect(page.getByRole("main")).toContainText("Laporan ini tidak sedang menunggu jawaban Anda.");
  await expect(page.getByLabel("Jawaban Anda")).toHaveCount(0);
});
