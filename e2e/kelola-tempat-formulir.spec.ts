import type { APIRequestContext, Page } from "@playwright/test";
import { mockApi, signIn, uniqueEmail } from "./akun-masuk";
import { blockingViolations } from "./axe";
import { photo } from "./foto";
import { stubGoogle } from "./google";
import { expect, test } from "./mapbox";

// Tambah dan ubah tempat di Kelola tempat (ADR-0051) dengan API tiruan dan Mapbox tiruan.
const email = (prefix: string) => uniqueEmail(prefix, test.info().project.name);
const main = (page: Page) => page.getByRole("main");
const unknown = ["ramp", "toilet_difabel", "guiding_block", "lift"].map((facility) => ({ facility, answer: "belum_tahu" }));

test.beforeEach(async ({ page }) => {
  test.setTimeout(60_000);
  await stubGoogle(page);
});

async function pickLocation(page: Page) {
  const search = main(page).getByRole("combobox", { name: "Cari nama tempat atau alamat" });
  await search.fill("masjid raya");
  await search.press("Enter");
  await expect(main(page).getByRole("option", { name: /Masjid Raya Bogor/ })).toBeVisible();
  const index = (await main(page).getByRole("option").allTextContents()).findIndex((text) => /Masjid Raya Bogor/.test(text));
  for (let i = 0; i <= index; i++) await search.press("ArrowDown");
  await search.press("Enter");
  await main(page).getByRole("button", { name: "Pakai lokasi ini" }).click();
  await expect(main(page).getByText("Lokasi dipakai", { exact: true })).toBeVisible();
}

/** Tempat buatan admin langsung lewat API tiruan, supaya data contoh tidak berubah. */
async function createViaApi(request: APIRequestContext, admin: string, name: string) {
  const response = await request.post(`${mockApi()}/admin/places`, {
    headers: { authorization: `Bearer akun:${admin}` },
    data: { name, category: "halte", location: { lat: -6.6, lng: 106.8 }, facilities: unknown, photos: [], reason: "Dibuat untuk tes" },
  });
  return ((await response.json()) as { placeId: string }).placeId;
}

test("creates a place that goes live at once, after warning about an answer without a photo", async ({ page }) => {
  const name = `Masjid admin ${test.info().project.name}`;
  await signIn(page, email("admin"));
  await page.goto("/verifikasi/tempat");
  await main(page).getByRole("link", { name: "Tambah tempat" }).click();
  await expect(page).toHaveURL("/verifikasi/tempat/baru");
  await main(page).getByRole("textbox", { name: "Nama tempat" }).fill(name);
  await main(page).getByRole("radio", { name: "Masjid" }).check();
  await pickLocation(page);
  await main(page).getByRole("group", { name: "Jawaban untuk Ramp / Jalur Landai" }).getByRole("radio", { name: /^Tersedia/ }).check();
  await main(page).getByRole("group", { name: "Jawaban untuk Toilet Difabel" }).getByRole("radio", { name: /^Tersedia/ }).check();
  await expect(main(page).getByText("Belum ada foto yang sesuai, jadi jawaban ini akan disimpan sebagai Belum diketahui: Ramp / Jalur Landai, Toilet Difabel.")).toBeVisible();
  await main(page).getByLabel("Pilih foto").setInputFiles([photo("pintu.png")]);
  await main(page).getByRole("combobox", { name: "Objek di foto 1" }).selectOption("pintu_masuk");
  await expect(main(page).getByText(/disimpan sebagai Belum diketahui: Toilet Difabel\.$/)).toBeVisible();

  await main(page).getByRole("button", { name: "Simpan dan tayangkan" }).click();
  await expect(main(page).getByLabel("Alasan perubahan")).toBeFocused();
  await expect(main(page).getByText("Tulis alasan, paling sedikit 5 karakter.")).toBeVisible();
  await main(page).getByLabel("Alasan perubahan").fill("Dicek langsung saat survei tim");
  await main(page).getByRole("button", { name: "Simpan dan tayangkan" }).click();

  await expect(page).toHaveURL(/\/verifikasi\/tempat\/[0-9a-f-]+\?tersimpan=1&belum=toilet_difabel$/);
  const notice = main(page).getByRole("status").filter({ hasText: "Tersimpan dan tayang" });
  await expect(notice).toContainText("Disimpan sebagai Belum diketahui karena belum ada foto yang sesuai: Toilet Difabel.");
  const history = main(page).getByRole("region", { name: "Riwayat" }).getByRole("listitem");
  await expect(history.first()).toContainText("Dibuat langsung oleh admin");
  await expect(history.first()).toContainText("Alasan: Dicek langsung saat survei tim");
  await main(page).getByRole("link", { name: "Lihat halaman publik" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(name);
  await expect(page.getByText(/^Diterbitkan langsung oleh admin · /)).toBeVisible();
});

test("changes a place, and refuses to overwrite a newer version", async ({ page, request }) => {
  const admin = email("admin");
  await signIn(page, admin);
  const id = await createViaApi(request, admin, `Halte ubah ${test.info().project.name}`);
  await page.goto(`/verifikasi/tempat/${id}`);
  await main(page).getByRole("link", { name: "Ubah tempat" }).click();
  await expect(page).toHaveURL(`/verifikasi/tempat/${id}/ubah`);
  await main(page).getByRole("textbox", { name: "Nama tempat" }).fill(`Halte Juanda ${test.info().project.name}`);
  await main(page).getByLabel("Pilih foto").setInputFiles([photo("pintu.png")]);
  await main(page).getByRole("combobox", { name: "Objek di foto 1" }).selectOption("pintu_masuk");
  await main(page).getByLabel("Alasan perubahan").fill("Nama resmi dari papan halte");
  await main(page).getByRole("button", { name: "Simpan perubahan" }).click();
  await expect(page).toHaveURL(`/verifikasi/tempat/${id}?tersimpan=1`);
  const latest = main(page).getByRole("region", { name: "Riwayat" }).getByRole("listitem").first();
  await expect(latest).toContainText("Diubah langsung oleh admin");
  await expect(latest).toContainText("Yang berubah: nama, foto");

  // Orang lain menyimpan lebih dulu: formulir yang terbuka tidak boleh menimpanya.
  await page.goto(`/verifikasi/tempat/${id}/ubah`);
  const current = await (await request.get(`${mockApi()}/admin/places/${id}`, { headers: { authorization: `Bearer akun:${admin}` } })).json();
  await request.patch(`${mockApi()}/admin/places/${id}`, {
    headers: { authorization: `Bearer akun:${admin}` },
    data: { ...current, facilities: unknown, photos: [], removePhotos: [], reason: "Perubahan dari tab lain" },
  });
  await main(page).getByLabel("Alasan perubahan").fill("Perubahan kedua");
  await main(page).getByRole("button", { name: "Simpan perubahan" }).click();
  await expect(main(page).getByRole("alert")).toContainText("Data lokasi ini baru saja berubah.");
});

test("starts a new place from an OpenStreetMap candidate with its name, category and first pin", async ({ page }) => {
  await signIn(page, email("admin"));
  await page.goto("/verifikasi/tempat/baru?osm=way/2&nama=Masjid%20Al-Ikhlas&kategori=masjid&lat=-6.5705&lng=106.7645");
  await expect(main(page).getByText("Nama, kategori, dan titik awal diisi dari OpenStreetMap.", { exact: false })).toBeVisible();
  await expect(main(page).getByRole("textbox", { name: "Nama tempat" })).toHaveValue("Masjid Al-Ikhlas");
  await expect(main(page).getByRole("radio", { name: "Masjid" })).toBeChecked();
  await expect(main(page).getByText(/-6,57050.*106,76450/)).toBeVisible();
});

for (const colorScheme of ["light", "dark"] as const) {
  test(`the place form (${colorScheme}) has no serious or critical WCAG 2.2 AA violations`, async ({ page }) => {
    await page.emulateMedia({ colorScheme, reducedMotion: "reduce" });
    await signIn(page, email("admin"));
    await page.goto("/verifikasi/tempat/baru");
    await main(page).getByRole("button", { name: "Simpan dan tayangkan" }).click();
    await expect(main(page).getByText("Tulis alasan, paling sedikit 5 karakter.")).toBeVisible();
    expect(await blockingViolations(page)).toEqual([]);
  });
}
