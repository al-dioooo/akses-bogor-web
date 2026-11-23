import type { Page } from "@playwright/test";
import { signIn, uniqueEmail } from "./akun-masuk";
import { blockingViolations } from "./axe";
import { photo } from "./foto";
import { stubGoogle } from "./google";
import { expect, test } from "./mapbox";

// Terbit langsung dari Laporkan, khusus admin (ADR-0051), dengan API tiruan dan Mapbox tiruan.
const email = (prefix: string) => uniqueEmail(prefix, test.info().project.name);
const main = (page: Page) => page.getByRole("main");

test.beforeEach(async ({ page }) => {
  test.setTimeout(60_000);
  await stubGoogle(page);
});

/** Mengisi ketiga langkah sampai ringkasan: ramp dan toilet Tersedia, dengan satu foto pintu masuk. */
async function fillUntilSummary(page: Page, name: string) {
  await page.goto("/laporkan");
  await main(page).getByRole("textbox", { name: "Nama tempat" }).fill(name);
  await main(page).getByRole("radio", { name: "Masjid" }).check();
  const search = main(page).getByRole("combobox", { name: "Cari nama tempat atau alamat" });
  await search.fill("masjid raya");
  await search.press("Enter");
  await expect(main(page).getByRole("option", { name: /Masjid Raya Bogor/ })).toBeVisible();
  const index = (await main(page).getByRole("option").allTextContents()).findIndex((text) => /Masjid Raya Bogor/.test(text));
  for (let i = 0; i <= index; i++) await search.press("ArrowDown");
  await search.press("Enter");
  await main(page).getByRole("button", { name: "Pakai lokasi ini" }).click();
  await expect(main(page).getByText("Lokasi dipakai", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Lanjut" }).click();
  await main(page).getByRole("group", { name: "Jawaban untuk Ramp / Jalur Landai" }).getByRole("radio", { name: /^Tersedia/ }).check();
  await main(page).getByRole("group", { name: "Jawaban untuk Toilet Difabel" }).getByRole("radio", { name: /^Tersedia/ }).check();
  await page.getByRole("button", { name: "Lanjut" }).click();
  await main(page).getByLabel("Pilih foto").setInputFiles([photo("pintu.png")]);
  await main(page).getByRole("combobox", { name: "Objek di foto 1" }).selectOption("pintu_masuk");
  await page.getByRole("button", { name: "Lihat ringkasan" }).click();
}

test("admins publish their own report directly with a reason, and see that the place is live", async ({ page }) => {
  await signIn(page, email("admin"));
  await fillUntilSummary(page, `Masjid langsung ${test.info().project.name}`);
  const direct = main(page).getByRole("group", { name: "Khusus admin" });
  await expect(direct).toContainText("tidak masuk antrean verifikasi");
  await direct.getByRole("checkbox", { name: "Terbitkan langsung (admin)" }).check();
  await expect(direct.getByRole("status")).toHaveText("Belum ada foto yang sesuai, jadi jawaban ini akan disimpan sebagai Belum diketahui: Toilet Difabel.");
  await page.getByRole("button", { name: "Terbitkan langsung" }).click();
  await expect(direct.getByLabel("Alasan terbit langsung")).toBeFocused();
  await expect(direct.getByText("Tulis alasan, paling sedikit 5 karakter.")).toBeVisible();
  await direct.getByLabel("Alasan terbit langsung").fill("Saya periksa sendiri kemarin");
  await page.getByRole("button", { name: "Terbitkan langsung" }).click();

  await expect(page).toHaveURL(/\/laporkan\/terkirim\?laporan=[0-9a-f-]+&langsung=1&belum=toilet_difabel$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Tempat ini sudah tayang");
  await expect(main(page)).toContainText("Diterbitkan");
  await expect(main(page)).toContainText("Disimpan sebagai Belum diketahui karena belum ada foto yang sesuai: Toilet Difabel.");
  await expect(main(page).getByRole("link", { name: "Lihat tempat" })).toHaveAttribute("href", /^\/lokasi\//);
  await expect(main(page).getByRole("link", { name: "Buka di Kelola tempat" })).toHaveAttribute("href", /^\/verifikasi\/tempat\//);
  await expect(main(page).getByRole("heading", { name: "Apa selanjutnya?" })).toHaveCount(0);
});

test("regular accounts do not see the option and send to the queue as before", async ({ page }) => {
  await signIn(page, email("lama"));
  await fillUntilSummary(page, `Masjid antrean ${test.info().project.name}`);
  await expect(main(page).getByRole("group", { name: "Khusus admin" })).toHaveCount(0);
  await page.getByRole("button", { name: "Kirim laporan" }).click();
  await expect(page).toHaveURL(/\/laporkan\/terkirim\?laporan=[0-9a-f-]+$/);
  await expect(main(page).getByRole("heading", { name: "Apa selanjutnya?" })).toBeVisible();

  // Alamat yang ditulis tangan tidak membuat laporan yang masih menunggu tampak sudah tayang.
  await page.goto(`${page.url()}&langsung=1`);
  await expect(main(page).getByRole("heading", { name: "Apa selanjutnya?" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).not.toHaveText("Tempat ini sudah tayang");
  await expect(main(page).getByRole("link", { name: "Lihat tempat" })).toHaveCount(0);
});

for (const colorScheme of ["light", "dark"] as const) {
  test(`the direct publish option (${colorScheme}) has no serious or critical WCAG 2.2 AA violations`, async ({ page }) => {
    await page.emulateMedia({ colorScheme, reducedMotion: "reduce" });
    await signIn(page, email("admin"));
    await fillUntilSummary(page, `Masjid axe ${test.info().project.name}`);
    await main(page).getByRole("checkbox", { name: "Terbitkan langsung (admin)" }).check();
    await page.getByRole("button", { name: "Terbitkan langsung" }).click();
    await expect(main(page).getByText("Tulis alasan, paling sedikit 5 karakter.")).toBeVisible();
    expect(await blockingViolations(page)).toEqual([]);
  });
}
