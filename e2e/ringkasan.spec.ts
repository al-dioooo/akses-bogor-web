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

test("walks a new account through its first route, with the next stop marked", async ({ page }) => {
  await signIn(page, email("lama"));
  const main = page.getByRole("main");
  await expect(main.getByText("Tidak ada yang menunggu Anda")).toBeVisible();
  const route = main.getByRole("region", { name: "Laporan saya" });
  await expect(route.getByRole("heading", { name: "Dari akun baru ke tempat pertama." })).toBeVisible();
  const stops = route.getByRole("listitem");
  await expect(stops).toHaveCount(4);
  await expect(stops.nth(0)).toContainText("Selesai");
  await expect(stops.nth(1)).toHaveAttribute("aria-current", "step");
  await expect(stops.nth(1)).toContainText("Berikutnya");
  await expect(stops.nth(1)).toContainText("Datangi satu tempat");
  await expect(route.getByRole("link", { name: "Laporkan tempat pertama" })).toHaveAttribute("href", "/laporkan");
  await expect(route.getByRole("link", { name: "Cari tempat dengan Agen AI" })).toHaveAttribute("href", "/agen");
  await page.goto("/akun/laporan");
  await expect(page.getByRole("navigation", { name: "Saring menurut status" })).toHaveCount(0);
  await expect(main.getByRole("heading", { level: 2 })).toHaveText("Tidak ada laporan");
});

test("suggests the districts that need data most, with the data caveat and its source", async ({ page }) => {
  await signIn(page, email("pelapor"));
  const next = page.getByRole("main").getByRole("region", { name: "Petakan berikutnya" });
  const districts = next.getByRole("listitem");
  await expect(districts).toHaveCount(3);
  await expect(districts.nth(0)).toContainText("Bogor Barat");
  await expect(districts.nth(0)).toContainText("Prioritas sangat tinggi");
  await expect(districts.nth(0)).toContainText("38 tempat belum punya data AksesBogor");
  await expect(next).toContainText("bukan jumlah seluruh penduduk");
  await expect(next).toContainText("Sumber: Open Data Kota Bogor, Dinas Sosial");
  await expect(next.getByRole("link", { name: "Cari tempat dengan Agen AI" })).toHaveAttribute("href", "/agen");
  await expect(next.getByRole("link", { name: "Lihat di peta" })).toHaveAttribute("href", "/peta");
});

test.describe("while the API keeps the district priority off", () => {
  // IP pengunjung yang membuat API tiruan menjawab 503 data_disabilitas_belum_aktif (e2e/mock-api/prioritas.mjs).
  test.use({ extraHTTPHeaders: { "x-forwarded-for": "203.0.113.251" } });

  test("only invites the account to report a place it knows", async ({ page }) => {
    await signIn(page, email("pelapor"));
    const next = page.getByRole("main").getByRole("region", { name: "Petakan berikutnya" });
    await expect(next).toContainText("Mulai dari tempat umum yang sering Anda datangi");
    await expect(next.getByRole("listitem")).toHaveCount(0);
    await expect(next).not.toContainText("Dinas Sosial");
  });
});

test.describe("while the API keeps the agent off", () => {
  // IP pengunjung yang membuat API tiruan menjawab agen_rute_belum_aktif (e2e/mock-api/agen-rute.mjs).
  test.use({ extraHTTPHeaders: { "x-forwarded-for": "203.0.113.250" } });

  test("leaves the agent out of the menu, the first route and the next place", async ({ page }) => {
    await signIn(page, email("lama"));
    const main = page.getByRole("main");
    await expect(main.getByRole("heading", { name: "Dari akun baru ke tempat pertama." })).toBeVisible();
    await expect(main.getByRole("region", { name: "Petakan berikutnya" }).getByRole("link", { name: "Laporkan tempat" })).toHaveAttribute("href", "/laporkan");
    await expect(page.getByRole("link", { name: "Cari tempat dengan Agen AI" })).toHaveCount(0);
    await expect(page.locator("#menu-dasbor").getByRole("link", { name: "Agen AI", includeHidden: true })).toHaveCount(0);
  });
});

test("shows verifiers the oldest report past the target and the state of the desk", async ({ page }) => {
  await signIn(page, email("verifikator"));
  const main = page.getByRole("main");
  const task = main.getByRole("region", { name: "Yang menunggu Anda" }).getByRole("link", { name: /lewat target 3 hari kerja/ });
  await expect(task).toContainText(/2 laporan lewat target 3 hari kerja/);
  await expect(task).toContainText(/Terlama: Masjid Jami contoh, menunggu \d+ hari kerja/);
  await expect(task).toHaveAttribute("href", "/verifikasi/laporan/10000000-0000-4000-8000-000000000001");

  const desk = main.getByRole("region", { name: "Meja verifikasi" }).getByRole("link");
  await expect(desk.filter({ hasText: "Antrean" })).toContainText(/Antrean\s*2/);
  await expect(desk.filter({ hasText: "Antrean" })).toContainText("2 lewat target 3 hari kerja");
  await expect(desk.filter({ hasText: "Menunggu jawaban" })).toContainText(/1\s*Tenggat terdekat 12 Nov 2026/);
  await expect(desk.filter({ hasText: "Perlu dicek ulang" })).toHaveAttribute("href", "/verifikasi/cek-ulang");
  await expect(main.getByRole("region", { name: "Tim verifikator" })).toHaveCount(0);
});

test("shows admins the team without emails, and hides the desk and team from regular accounts", async ({ page }) => {
  await signIn(page, email("admin"));
  const team = page.getByRole("main").getByRole("region", { name: "Tim verifikator" });
  await expect(team).toContainText(/\d+ verifikator dan \d+ admin/);
  await expect(team).not.toContainText("@");
  await expect(team.getByRole("link", { name: "Kelola tim" })).toHaveAttribute("href", "/verifikasi/tim");

  await page.context().clearCookies();
  await signIn(page, email("pelapor"));
  await expect(page.getByRole("main").getByRole("region", { name: "Laporan saya" })).toBeVisible();
  await expect(page.getByRole("main").getByRole("region", { name: "Meja verifikasi" })).toHaveCount(0);
  await expect(page.getByRole("main").getByRole("region", { name: "Tim verifikator" })).toHaveCount(0);
});

for (const colorScheme of ["light", "dark"] as const) {
  for (const prefix of ["pelapor", "lama", "verifikator", "admin"]) {
    test(`Ringkasan for ${prefix} (${colorScheme}) has no serious or critical WCAG 2.2 AA violations`, async ({ page }) => {
      await page.emulateMedia({ colorScheme, reducedMotion: "reduce" });
      await signIn(page, email(prefix));
      // Next 16 mengalirkan <title> setelah redirect dari server action; axe memeriksa judul dokumen.
      await expect(page).toHaveTitle(/^Akun saya/);
      await expect(page.getByRole("region", { name: "Yang menunggu Anda" })).toBeVisible();
      await expect(page.getByRole("region", { name: "Laporan saya" })).toBeVisible();
      await expect(page.getByRole("region", { name: "Petakan berikutnya" })).toBeVisible();
      expect(await blockingViolations(page)).toEqual([]);
    });
  }
}
