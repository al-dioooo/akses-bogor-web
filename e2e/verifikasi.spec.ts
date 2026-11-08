import { expect, test, type Page } from "@playwright/test";
import { mockApi, signIn, uniqueEmail } from "./akun-masuk";
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

test("checks each answer and previews the status before publishing (FR-33)", async ({ page }) => {
  await signIn(page, email("verifikator"));
  await page.goto("/verifikasi/laporan/10000000-0000-4000-8000-000000000001");
  const decision = page.getByRole("region", { name: "Keputusan" });
  await expect(decision).toContainText("0 dari 4 jawaban diperiksa");
  await expect(decision.getByRole("link", { name: "Tandai bukti untuk Ramp / Jalur Landai." })).toBeVisible();

  await page.getByRole("group", { name: "Bukti untuk Ramp / Jalur Landai" }).getByRole("radio", { name: /^Terbukti/ }).check();
  // Toilet "Tersedia" tanpa foto toilet: tanpa bukti menjadi Belum diketahui.
  await page.getByRole("group", { name: "Bukti untuk Toilet Difabel" }).getByRole("radio", { name: /^Tanpa bukti/ }).check();
  const guiding = page.getByRole("region", { name: "Guiding Block" });
  await guiding.getByRole("radio", { name: /^Terbukti/ }).check();
  await guiding.getByRole("radio", { name: "Tidak tersedia" }).check();
  await expect(decision.getByRole("link", { name: "Pilih alasan Tidak tersedia untuk Guiding Block." })).toBeVisible();
  await guiding.getByRole("radio", { name: "Tidak ada" }).check();
  await page.getByRole("group", { name: "Bukti untuk Lift / Elevator" }).getByRole("radio", { name: /^Terbukti/ }).check();

  await expect(decision).toContainText("Semua jawaban sudah diperiksa.");
  await expect(decision).toContainText("Sebagian");
  await expect(decision).toContainText("1 dari 3 fasilitas tersedia · 1 belum diketahui");
});

test("lets the verifier fix the place fields, and only for new places and Edit lokasi", async ({ page }) => {
  await signIn(page, email("verifikator"));
  await page.goto("/verifikasi/laporan/10000000-0000-4000-8000-000000000001");
  const name = page.getByLabel("Nama tempat", { exact: true });
  await name.fill("");
  const problem = page.getByRole("region", { name: "Keputusan" }).getByRole("link", { name: "Isi nama tempat, paling banyak 120 karakter." });
  await problem.click();
  await expect(name).toBeFocused();
  await name.fill("Masjid Jami Al-Contoh");
  await expect(problem).toHaveCount(0);
  await expect(page.getByRole("group", { name: "Kategori" }).getByRole("radio", { name: "Masjid" })).toBeChecked();
  await expect(page.getByLabel("Deskripsi yang tayang")).toHaveValue("Ramp di pintu utama, toilet di sebelah kanan.");

  await page.goto("/verifikasi/laporan/10000000-0000-4000-8000-000000000002");
  await expect(page.getByRole("heading", { name: "Halte contoh", level: 1 })).toBeVisible();
  await expect(page.getByLabel("Nama tempat", { exact: true })).toHaveCount(0);
  await expect(page.getByLabel("Deskripsi yang tayang")).toBeVisible();
});

async function checkAll(page: Page) {
  for (const facility of ["Ramp / Jalur Landai", "Toilet Difabel", "Guiding Block", "Lift / Elevator"]) {
    await page.getByRole("group", { name: `Bukti untuk ${facility}` }).getByRole("radio", { name: /^Terbukti/ }).check();
  }
}

test("publishes a checked report and offers the place page (FR-32)", async ({ page }) => {
  await signIn(page, email("verifikator"));
  await page.goto("/verifikasi/laporan/10000000-0000-4000-8000-000000000001");
  const decision = page.getByRole("region", { name: "Keputusan" });
  await decision.getByRole("button", { name: "Terbitkan laporan" }).click();
  await expect(decision).toContainText("Lengkapi daftar Sebelum terbit dulu.");
  await checkAll(page);
  await decision.getByLabel("Catatan untuk verifikator lain").fill("Ramp terlihat di foto 1");
  await decision.getByRole("button", { name: "Terbitkan laporan" }).click();
  const done = decision.getByRole("heading", { name: "Laporan diterbitkan" });
  await expect(done).toBeFocused();
  await expect(decision.getByRole("link", { name: "Lihat halaman tempat" })).toHaveAttribute("href", /^\/lokasi\//);
  await page.goto("/verifikasi");
  await expect(page.getByRole("main")).not.toContainText("Masjid Jami contoh");
});

test("rejects with a standard reason and shows the message the reporter gets", async ({ page }) => {
  await signIn(page, email("verifikator"));
  await page.goto("/verifikasi/laporan/10000000-0000-4000-8000-000000000002");
  const decision = page.getByRole("region", { name: "Keputusan" });
  await decision.getByRole("radio", { name: /^Tolak/ }).check();
  await decision.getByRole("button", { name: "Tolak laporan" }).click();
  await expect(decision).toContainText("Pilih alasan penolakan dulu.");
  const duplicate = decision.getByRole("radio", { name: /^Duplikat/ });
  await expect(duplicate).toHaveAccessibleName(/Pesan untuk pelapor: Tempat ini sudah ada di AksesBogor/);
  await duplicate.check();
  await decision.getByRole("button", { name: "Tolak laporan" }).click();
  await expect(decision.getByRole("heading", { name: "Laporan ditolak" })).toBeFocused();
});

test("asks the reporter a question with a seven-day deadline (FR-41)", async ({ page }) => {
  await signIn(page, email("verifikator"));
  await page.goto("/verifikasi/laporan/10000000-0000-4000-8000-000000000001");
  const decision = page.getByRole("region", { name: "Keputusan" });
  await decision.getByRole("radio", { name: /^Minta klarifikasi/ }).check();
  await decision.getByRole("button", { name: "Kirim pertanyaan" }).click();
  await expect(decision).toContainText("Tulis pertanyaannya dulu.");
  await decision.getByLabel("Pertanyaan untuk pelapor").fill("Bisakah Anda menambahkan foto toilet dari pintunya?");
  await decision.getByRole("button", { name: "Kirim pertanyaan" }).click();
  await expect(decision.getByRole("heading", { name: "Pertanyaan terkirim" })).toBeFocused();
  await page.goto("/verifikasi/jawaban");
  await expect(page.getByRole("main")).toContainText("Masjid Jami contoh");
});

test("fixes photo tags and captions and hides photos before deciding (FR-34)", async ({ page }) => {
  await signIn(page, email("verifikator"));
  await page.goto("/verifikasi/laporan/10000000-0000-4000-8000-000000000001");
  const photos = page.getByRole("region", { name: "Foto" });
  await photos.getByLabel("Tag foto 2").selectOption({ label: "Lift" });
  await expect(photos.getByRole("status").filter({ hasText: "Foto 2 tersimpan." })).toBeVisible();
  await photos.getByLabel("Keterangan foto 2").fill("Pintu lift lantai dasar");
  await photos.getByRole("button", { name: "Simpan keterangan" }).nth(1).click();
  await expect(photos).toContainText("Pintu lift lantai dasar");
  const hide = photos.getByRole("button", { name: "Sembunyikan foto 2" });
  await expect(hide).toHaveAttribute("aria-pressed", "false");
  await hide.click();
  const show = photos.getByRole("button", { name: "Tampilkan lagi foto 2" });
  await expect(show).toHaveAttribute("aria-pressed", "true");
  await expect(photos).toContainText("Foto yang disembunyikan dihapus saat laporan terbit.");
  await page.reload();
  await expect(page.getByRole("region", { name: "Foto" }).getByLabel("Tag foto 2")).toHaveValue("lift");
});

test("marks blur areas with the keyboard or by dragging, and previews the result (FR-34)", async ({ page }) => {
  await signIn(page, email("verifikator"));
  await page.goto("/verifikasi/laporan/10000000-0000-4000-8000-000000000001");
  await page.getByRole("button", { name: "Kaburkan area foto 1" }).click();
  const editor = page.getByRole("dialog", { name: "Kaburkan area foto 1" });
  await expect(editor).toBeVisible();

  await editor.getByRole("button", { name: "Tambah area" }).click();
  const first = editor.getByRole("button", { name: /^Area 1:/ });
  await expect(first).toBeFocused();
  await expect(first).toHaveAccessibleName("Area 1: kiri 40%, atas 40%, lebar 20%, tinggi 20%");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Shift+ArrowDown");
  await expect(first).toHaveAccessibleName("Area 1: kiri 44%, atas 40%, lebar 20%, tinggi 22%");
  await editor.getByRole("spinbutton", { name: "Lebar" }).fill("30");
  await expect(first).toHaveAccessibleName("Area 1: kiri 44%, atas 40%, lebar 30%, tinggi 22%");
  expect(await blockingViolations(page)).toEqual([]);

  // Seret dari pojok kiri atas foto untuk area kedua, lalu hapus dengan Delete.
  const image = editor.getByRole("img");
  const box = (await image.boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.05, box.y + box.height * 0.05);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.25, box.y + box.height * 0.3, { steps: 4 });
  await page.mouse.up();
  const second = editor.getByRole("button", { name: /^Area 2:/ });
  await expect(second).toBeFocused();
  await page.keyboard.press("Delete");
  await expect(second).toHaveCount(0);

  await editor.getByRole("button", { name: "Simpan area" }).click();
  await expect(editor).toBeHidden();
  const photos = page.getByRole("region", { name: "Foto" });
  await expect(photos).toContainText("1 area dikaburkan");
  await expect(photos.getByRole("img").first()).toHaveAttribute("src", /versi=kabur&v=1$/);
});

test("lets an admin add and remove verifiers by exact email (FR-36)", async ({ page, request }) => {
  // Akun lengkap yang akan dijadikan verifikator; email lama- di API tiruan langsung lengkap dengan nama Sari.
  const member = email("lama");
  await request.post(`${mockApi()}/auth/code/verify`, { data: { email: member, code: "123456" } });

  await signIn(page, email("admin"));
  await page.goto("/verifikasi");
  await page.getByRole("navigation", { name: "Bagian meja verifikasi" }).getByRole("link", { name: "Tim verifikator" }).click();
  await expect(page).toHaveURL(/\/verifikasi\/tim$/);
  const add = page.getByRole("region", { name: "Tambah verifikator" });
  await add.getByLabel("Email akun").fill("tidak-ada@contoh.id");
  await add.getByRole("button", { name: "Jadikan verifikator" }).click();
  await expect(add.getByRole("alert")).toContainText("Tidak ada akun dengan email itu.");

  await add.getByLabel("Email akun").fill(member);
  await add.getByRole("button", { name: "Jadikan verifikator" }).click();
  await expect(add.getByRole("status")).toContainText("Sari sekarang verifikator.");
  const row = page.getByRole("listitem").filter({ hasText: member });
  await expect(row).toContainText("Verifikator");
  await row.getByRole("button", { name: "Cabut peran verifikator Sari" }).click();
  await expect(page.getByRole("listitem").filter({ hasText: member })).toHaveCount(0);
  expect(await blockingViolations(page)).toEqual([]);
});

test("keeps the team page for admins only", async ({ page }) => {
  await signIn(page, email("verifikator"));
  await page.goto("/verifikasi/tim");
  await expect(page.getByRole("main")).toContainText("Halaman ini khusus admin.");
  await expect(page.getByRole("link", { name: "Tim verifikator" })).toHaveCount(0);
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
