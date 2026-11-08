import type { Page } from "@playwright/test";
import { mockApi, uniqueEmail } from "./akun-masuk";
import { blockingViolations } from "./axe";
import { photo } from "./foto";
import { stubGoogle } from "./google";
import { expect, test } from "./mapbox";

// Laporkan (FR-20 sampai FR-27) dengan API tiruan (e2e/mock-api/laporkan.mjs) dan Mapbox tiruan.
const HALTE = "4037ba19-b366-45bc-aceb-270944fe9372";
const email = (prefix: string) => uniqueEmail(prefix, test.info().project.name);
// Next.js menyimpan halaman yang ditinggalkan secara tersembunyi, jadi pencarian selalu di dalam main yang tampil.
const main = (page: Page) => page.getByRole("main");

// Setiap tes melewati beberapa langkah dengan pencarian dan pengecekan lokasi, jadi batas waktunya lebih longgar.
test.beforeEach(async ({ page }) => {
  test.setTimeout(60_000);
  await stubGoogle(page);
});

async function pickPlace(page: Page, query: string, option: RegExp) {
  const search = main(page).getByRole("combobox", { name: "Cari nama tempat atau alamat" });
  await search.fill(query);
  await search.press("Enter");
  await expect(main(page).getByRole("option", { name: option })).toBeVisible();
  const index = (await main(page).getByRole("option").allTextContents()).findIndex((text) => option.test(text));
  for (let i = 0; i <= index; i++) await search.press("ArrowDown");
  await search.press("Enter");
}

async function fillStep1(page: Page, name: string) {
  await main(page).getByRole("textbox", { name: "Nama tempat" }).fill(name);
  await main(page).getByRole("radio", { name: "Masjid" }).check();
  await pickPlace(page, "masjid raya", /Masjid Raya Bogor/);
  await main(page).getByRole("button", { name: "Pakai lokasi ini" }).click();
  await expect(main(page).getByText("Lokasi dipakai", { exact: true })).toBeVisible();
}

async function signIn(page: Page, address: string) {
  await page.getByLabel("Email").fill(address);
  await page.getByRole("button", { name: "Kirim kode" }).click();
  await page.getByLabel("Kode 6 digit").fill("123456");
  await page.getByRole("button", { name: "Masuk", exact: true }).click();
}

test("a signed-out reporter fills the three steps, signs in, and sends from the summary", async ({ page }) => {
  await page.goto("/laporkan");
  await expect(main(page).getByRole("heading", { name: "Langkah 1 dari 3: Informasi dan lokasi" })).toBeVisible();
  await fillStep1(page, "Masjid Al-Ikhlas contoh");
  await page.getByRole("button", { name: "Lanjut" }).click();
  await expect(page).toHaveURL(/langkah=2/);
  await expect(main(page).getByRole("heading", { name: "Langkah 2 dari 3: Fasilitas" })).toBeFocused();

  const lift = main(page).getByRole("group", { name: "Jawaban untuk Lift / Elevator" });
  await lift.getByRole("radio", { name: /^Tidak tersedia/ }).check();
  await main(page).getByRole("group", { name: "Alasan tidak tersedia (opsional)" }).getByRole("radio", { name: /^Rusak/ }).check();
  await main(page).getByRole("textbox", { name: "Catatan untuk Lift / Elevator (opsional)" }).fill("Mati sejak Oktober");
  await page.getByRole("button", { name: "Lanjut" }).click();

  await main(page).getByLabel("Pilih foto").setInputFiles([photo("pintu.png", 3000, 2000), photo("lift.png")]);
  await expect(main(page).getByText("2 foto ditambahkan. Pilih objek di setiap foto.")).toBeVisible();
  await main(page).getByRole("combobox", { name: "Objek di foto 1" }).selectOption("pintu_masuk");
  await main(page).getByRole("combobox", { name: "Objek di foto 2" }).selectOption("lift");
  // Foto diperkecil di browser: sisi terpanjang 2048 px.
  await expect(main(page).getByText("2048 × 1365 px", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "Lihat ringkasan" }).click();

  await expect(main(page).getByText("Tidak tersedia · Rusak")).toBeVisible();
  await expect(main(page).getByText(/Anda akan diminta masuk sebelum laporan dikirim/)).toBeVisible();
  await page.getByRole("button", { name: "Masuk lalu kirim" }).click();
  await expect(page).toHaveURL(/\/masuk\?kembali=%2Flaporkan%3Flangkah%3Dringkasan$/);
  await signIn(page, email("pelapor"));

  // Kembali ke ringkasan yang sama, dengan isian dan foto dari draf (FR-20).
  await expect(page).toHaveURL(/\/laporkan\?langkah=ringkasan$/);
  await expect(main(page).getByText("Masjid Al-Ikhlas contoh")).toBeVisible();
  await expect(main(page).getByText("2 foto")).toBeVisible();
  await page.getByRole("button", { name: "Kirim laporan" }).click();

  await expect(page).toHaveURL(/\/laporkan\/terkirim\?laporan=/);
  await expect(main(page).getByRole("heading", { level: 1 })).toHaveText("Terima kasih, laporan Anda kami terima");
  await expect(main(page).getByText("Menunggu verifikasi")).toBeVisible();
  await main(page).getByRole("link", { name: "Lihat Laporan saya" }).click();
  await expect(main(page).getByRole("listitem").filter({ hasText: "Masjid Al-Ikhlas contoh" })).toContainText("Menunggu verifikasi");

  // Draf terhapus setelah terkirim, jadi formulir baru kosong.
  await page.goto("/laporkan");
  await expect(main(page).getByRole("textbox", { name: "Nama tempat" })).toHaveValue("");
});

test("keeps every answer on back, forward, and reload", async ({ page }) => {
  await page.goto("/laporkan");
  await fillStep1(page, "Masjid Kenangan contoh");
  await page.getByRole("button", { name: "Lanjut" }).click();
  await main(page).getByRole("group", { name: "Jawaban untuk Ramp / Jalur Landai" }).getByRole("radio", { name: /^Tersedia/ }).check();
  await page.goBack();
  await expect(main(page).getByRole("heading", { name: "Langkah 1 dari 3: Informasi dan lokasi" })).toBeFocused();
  await expect(main(page).getByRole("textbox", { name: "Nama tempat" })).toHaveValue("Masjid Kenangan contoh");
  await page.goForward();
  await expect(main(page).getByRole("group", { name: "Jawaban untuk Ramp / Jalur Landai" }).getByRole("radio", { name: /^Tersedia/ })).toBeChecked();
  await page.reload();
  await expect(main(page).getByText("Draf terakhir dipulihkan.")).toBeAttached();
  await expect(main(page).getByRole("group", { name: "Jawaban untuk Ramp / Jalur Landai" }).getByRole("radio", { name: /^Tersedia/ })).toBeChecked();
});

test("links each missing field from the error summary", async ({ page }) => {
  await page.goto("/laporkan");
  await page.getByRole("button", { name: "Lanjut" }).click();
  const summary = main(page).getByRole("group", { name: "Periksa lagi isian berikut" });
  await expect(summary).toBeFocused();
  await expect(summary.getByRole("link")).toHaveText(["Isi nama tempat.", "Pilih satu kategori.", "Tentukan titik lokasi, lalu tekan Pakai lokasi ini."]);
  await summary.getByRole("link", { name: "Isi nama tempat." }).click();
  await expect(main(page).getByRole("textbox", { name: "Nama tempat" })).toBeFocused();
  await expect(main(page).getByRole("textbox", { name: "Nama tempat" })).toHaveAttribute("aria-invalid", "true");
});

test("explains the coverage for a point outside Kota Bogor (FR-22)", async ({ page }) => {
  await page.goto("/laporkan");
  await pickPlace(page, "dramaga", /Kampus IPB Dramaga/);
  await main(page).getByRole("button", { name: "Pakai lokasi ini" }).click();
  await expect(main(page).getByText(/Titik ini berada di luar Kota Bogor\. Untuk saat ini AksesBogor hanya mencatat tempat di enam kecamatan/)).toBeVisible();
  await expect(main(page).getByRole("group", { name: "Lokasi" })).toHaveAttribute("aria-describedby", /lokasi-galat/);
});

test("asks about a similar place nearby before continuing (FR-23)", async ({ page }) => {
  await page.goto("/laporkan");
  await main(page).getByRole("textbox", { name: "Nama tempat" }).fill("Halte contoh");
  await main(page).getByRole("radio", { name: "Halte" }).check();
  await pickPlace(page, "halte contoh", /^Halte contoh, Bogor Tengah/);
  await expect(main(page).getByRole("link", { name: "Laporkan kekurangan di Halte contoh" }).first()).toHaveAttribute("href", `/laporkan?lokasi=${HALTE}&jenis=kekurangan`);
  await main(page).getByRole("button", { name: "Pakai lokasi ini" }).click();
  await expect(main(page).getByRole("heading", { name: "Mungkin tempat ini sudah ada" })).toBeVisible();
  // Tombol berlabel nama tempat tidak boleh melebarkan halaman.
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width);
  await page.getByRole("button", { name: "Lanjut" }).click();
  await expect(main(page).getByRole("group", { name: "Periksa lagi isian berikut" })).toContainText("Jawab dulu peringatan tempat yang mungkin sudah ada.");
  await main(page).getByRole("button", { name: "Bukan, ini tempat lain" }).click();
  await page.getByRole("button", { name: "Lanjut" }).click();
  await expect(page).toHaveURL(/langkah=2/);
});

test("retries a failed photo and keeps the form when the session has expired", async ({ page }) => {
  const address = email("pelapor");
  await page.goto("/masuk?kembali=%2Flaporkan");
  await signIn(page, address);
  await expect(page).toHaveURL(/\/laporkan$/);
  await fillStep1(page, "Masjid Ulang contoh");
  await page.getByRole("button", { name: "Lanjut" }).click();
  await page.getByRole("button", { name: "Lanjut" }).click();
  await main(page).getByLabel("Pilih foto").setInputFiles([photo("pintu.png")]);
  await main(page).getByRole("combobox", { name: "Objek di foto 1" }).selectOption("pintu_masuk");
  await page.getByRole("button", { name: "Lihat ringkasan" }).click();

  await page.request.post(`${mockApi()}/_tiruan/foto-gagal`, { data: { kali: 1 } });
  await page.getByRole("button", { name: "Kirim laporan" }).click();
  await expect(main(page).getByRole("alert")).toContainText("Foto 1 gagal diunggah");

  // Sesi berakhir: ke Masuk dengan pesan sesi berakhir, lalu kembali ke ringkasan yang utuh.
  await page.request.post(`${mockApi()}/_tiruan/cabut-sesi`, { data: { email: address } });
  await page.getByRole("button", { name: "Kirim laporan" }).click();
  await expect(page).toHaveURL(/\/masuk\?sesi=berakhir&kembali=%2Flaporkan%3Flangkah%3Dringkasan$/);
  await signIn(page, address);
  await expect(main(page).getByText("Masjid Ulang contoh")).toBeVisible();
  await page.getByRole("button", { name: "Kirim laporan" }).click();
  await expect(page).toHaveURL(/\/laporkan\/terkirim/);
});

test("opens Edit lokasi and Laporkan kekurangan from Detail with the current data (FR-27)", async ({ page }) => {
  await page.goto(`/lokasi/${HALTE}`);
  await main(page).getByRole("link", { name: "Laporkan kekurangan" }).click();
  await expect(main(page).getByRole("heading", { name: "Tempat yang dilaporkan" })).toBeVisible();
  await expect(main(page).getByRole("textbox", { name: "Nama tempat" })).toHaveCount(0);
  await page.getByRole("button", { name: "Lanjut" }).click();
  const guiding = main(page).getByRole("group", { name: "Jawaban untuk Guiding Block" });
  await expect(guiding.getByRole("radio", { name: /^Tidak tersedia/ })).toBeChecked();

  await page.goto(`/lokasi/${HALTE}`);
  await main(page).getByRole("link", { name: "Edit lokasi" }).click();
  await expect(main(page).getByRole("textbox", { name: "Nama tempat" })).toHaveValue("Halte contoh");
  await expect(main(page).getByRole("radio", { name: "Halte" })).toBeChecked();
  await expect(main(page).getByText("Lokasi dipakai", { exact: true })).toBeVisible();
});

test("clears the drafts on this device when signing out", async ({ page }) => {
  await page.goto("/masuk?kembali=%2Flaporkan");
  await signIn(page, email("lama"));
  await main(page).getByRole("textbox", { name: "Nama tempat" }).fill("Draf di perangkat bersama");
  await page.waitForTimeout(500);
  await page.goto("/akun");
  await main(page).getByRole("button", { name: "Keluar" }).click();
  await expect(page).toHaveURL(/\/$/);
  await page.goto("/laporkan");
  await expect(main(page).getByRole("textbox", { name: "Nama tempat" })).toHaveValue("");
});

test("fits a 320 px screen without sideways scrolling", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  for (const step of ["1", "2", "3", "ringkasan"]) {
    await page.goto(`/laporkan?langkah=${step}`);
    await expect(main(page).locator("h2").first()).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  }
});

// Setiap langkah, ringkasan, dan Laporan terkirim di mode terang dan gelap (ADR-0021, ADR-0027).
for (const colorScheme of ["light", "dark"] as const) {
  test(`every step has no serious or critical WCAG 2.2 AA violations (${colorScheme})`, async ({ page }) => {
    await page.emulateMedia({ colorScheme, reducedMotion: "reduce" });
    await page.goto("/laporkan");
    await fillStep1(page, "Masjid Aksesibel contoh");
    expect(await blockingViolations(page)).toEqual([]);
    await page.getByRole("button", { name: "Lanjut" }).click();
    await main(page).getByRole("group", { name: "Jawaban untuk Lift / Elevator" }).getByRole("radio", { name: /^Tidak tersedia/ }).check();
    expect(await blockingViolations(page)).toEqual([]);
    await page.getByRole("button", { name: "Lanjut" }).click();
    await main(page).getByLabel("Pilih foto").setInputFiles([photo("pintu.png")]);
    await expect(main(page).getByRole("combobox", { name: "Objek di foto 1" })).toBeVisible();
    expect(await blockingViolations(page)).toEqual([]);
    await page.getByRole("button", { name: "Lihat ringkasan" }).click();
    await main(page).getByRole("combobox", { name: "Objek di foto 1" }).selectOption("pintu_masuk");
    await page.getByRole("button", { name: "Lihat ringkasan" }).click();
    await expect(main(page).getByRole("heading", { name: "Ringkasan", exact: true })).toBeVisible();
    expect(await blockingViolations(page)).toEqual([]);
    await page.getByRole("button", { name: "Masuk lalu kirim" }).click();
    await signIn(page, email("pelapor"));
    await page.getByRole("button", { name: "Kirim laporan" }).click();
    await expect(main(page).getByText("Menunggu verifikasi")).toBeVisible();
    expect(await blockingViolations(page)).toEqual([]);
  });
}
