import { expect, test, type Page } from "@playwright/test";
import { mockApi, signIn, uniqueEmail } from "./akun-masuk";
import { blockingViolations } from "./axe";
import { stubGoogle } from "./google";

// Akun Saya, Laporan saya (FR-14), ubah nama (FR-12), Keluar, dan Hapus Akun (FR-13) dengan API tiruan.
const email = (prefix: string) => uniqueEmail(prefix, test.info().project.name);
const isPhone = () => test.info().project.name === "ponsel";

test.beforeEach(async ({ page }) => {
  await stubGoogle(page);
});

/** Tautan akun di header (desktop) atau di menu Lainnya (ponsel). */
async function accountLink(page: Page, name: string) {
  if (!isPhone()) return page.getByRole("banner").getByRole("link", { name });
  await page.getByRole("button", { name: "Lainnya" }).click();
  return page.locator("#menu-lainnya").getByRole("link", { name });
}

test("sends a signed-out visitor to Masuk and back to Akun Saya", async ({ page }) => {
  await page.goto("/akun");
  await expect(page).toHaveURL(/\/masuk\?kembali=%2Fakun$/);
  await page.getByLabel("Email").fill(email("lama"));
  await page.getByRole("button", { name: "Kirim kode" }).click();
  await page.getByLabel("Kode 6 digit").fill("123456");
  await page.getByRole("button", { name: "Masuk", exact: true }).click();
  await expect(page).toHaveURL(/\/akun$/);
});

test("shows Akun saya instead of Masuk once signed in, and an empty Laporan saya", async ({ page }) => {
  const address = email("lama");
  await page.goto("/");
  await expect(await accountLink(page, "Masuk")).toBeVisible();
  await signIn(page, address);
  await expect(page).toHaveURL(/\/akun$/);
  await expect(page.getByRole("main").getByText(address)).toBeVisible();
  await expect(page.getByRole("heading", { name: "Belum ada laporan" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Laporkan tempat" }).last()).toHaveAttribute("href", "/laporkan");
  await page.goto("/jelajahi");
  await expect(await accountLink(page, "Akun saya")).toHaveAttribute("href", "/akun");
});

test("lists each report with its status as text, the rejection reason, and the clarification question", async ({ page }) => {
  await signIn(page, email("pelapor"));
  const reports = page.getByRole("region", { name: "Laporan saya" }).getByRole("listitem");
  await expect(reports).toHaveCount(4);
  await expect(reports.nth(0)).toContainText("Perlu klarifikasi");
  await expect(reports.nth(0)).toContainText("Apakah ramp-nya sampai ke pintu utama?");
  await expect(reports.nth(1)).toContainText("Menunggu verifikasi");
  await expect(reports.nth(2)).toContainText("Diterbitkan");
  await expect(reports.nth(3)).toContainText("Ditolak");
  await expect(reports.nth(3)).toContainText("Alasan: Bukti tidak cukup");
});

test("renames the account and explains an empty name", async ({ page }) => {
  await signIn(page, email("lama"));
  const name = page.getByLabel("Nama tampilan");
  await expect(name).toHaveValue("Sari");
  await name.fill("");
  await page.getByRole("button", { name: "Simpan nama" }).click();
  await expect(name).toBeFocused();
  await expect(name).toHaveAccessibleDescription(/Isi nama tampilan\./);

  await name.fill("Sari Lestari");
  await page.getByRole("button", { name: "Simpan nama" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Nama tampilan sudah diubah." })).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Nama tampilan")).toHaveValue("Sari Lestari");
});

test("signs out from Akun Saya", async ({ page }) => {
  await signIn(page, email("lama"));
  await page.getByRole("button", { name: "Keluar" }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(await accountLink(page, "Masuk")).toBeVisible();
  await page.goto("/akun");
  await expect(page).toHaveURL(/\/masuk\?kembali=%2Fakun$/);
});

test("sends a revoked session to Masuk with a message", async ({ page, context, request }) => {
  await signIn(page, email("lama"));
  const token = (await context.cookies()).find((cookie) => cookie.name === "__Host-aksesbogor-sesi")!.value;
  await request.post(`${mockApi()}/auth/logout`, { headers: { authorization: `Bearer ${token}` } });
  await page.goto("/akun");
  await expect(page).toHaveURL(/\/masuk\?sesi=berakhir&kembali=%2Fakun$/);
  await expect(page.getByText("Sesi Anda sudah berakhir. Silakan masuk lagi.")).toBeVisible();
});

test("deletes the account only after the confirmation box is ticked (ADR-0024)", async ({ page, request }) => {
  const address = email("pelapor");
  await signIn(page, address);
  await page.getByRole("link", { name: "Lihat apa yang dihapus" }).click();
  await expect(page).toHaveURL(/\/akun\/hapus$/);
  await expect(page.getByText("3 laporan Anda yang belum terbit ikut dihapus.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Yang tetap tayang" })).toBeVisible();

  const confirm = page.getByLabel("Saya mengerti bahwa akun ini dan laporan yang belum terbit dihapus permanen.");
  await page.getByRole("button", { name: "Hapus akun saya" }).click();
  await expect(confirm).toBeFocused();
  await expect(confirm).toHaveAccessibleDescription("Centang kotak konfirmasi dulu untuk menghapus akun.");

  await confirm.check();
  await page.getByRole("button", { name: "Hapus akun saya" }).click();
  await expect(page).toHaveURL(/\/akun\/dihapus$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Akun Anda sudah dihapus.");
  const res = await request.get(`${mockApi()}/_tiruan/akun?email=${encodeURIComponent(address)}`);
  expect(await res.json()).toEqual({ exists: false });
  await page.goto("/akun");
  await expect(page).toHaveURL(/\/masuk\?kembali=%2Fakun$/);
});

for (const colorScheme of ["light", "dark"] as const) {
  test(`account pages (${colorScheme}) have no serious or critical WCAG 2.2 AA violations`, async ({ page }) => {
    await page.emulateMedia({ colorScheme, reducedMotion: "reduce" });
    await signIn(page, email("pelapor"));
    await expect(page).toHaveTitle(/^Akun saya/);
    await expect(page.getByRole("region", { name: "Laporan saya" }).getByRole("listitem")).toHaveCount(4);
    expect(await blockingViolations(page)).toEqual([]);

    await page.goto("/akun/hapus");
    await page.getByRole("button", { name: "Hapus akun saya" }).click();
    await expect(page.getByText("Centang kotak konfirmasi dulu untuk menghapus akun.")).toBeVisible();
    expect(await blockingViolations(page)).toEqual([]);

    await page.goto("/akun/dihapus");
    expect(await blockingViolations(page)).toEqual([]);
  });

  test(`empty Laporan saya (${colorScheme}) has no serious or critical WCAG 2.2 AA violations`, async ({ page }) => {
    await page.emulateMedia({ colorScheme, reducedMotion: "reduce" });
    await signIn(page, email("lama"));
    await expect(page).toHaveTitle(/^Akun saya/);
    await expect(page.getByRole("heading", { name: "Belum ada laporan" })).toBeVisible();
    expect(await blockingViolations(page)).toEqual([]);
  });
}
