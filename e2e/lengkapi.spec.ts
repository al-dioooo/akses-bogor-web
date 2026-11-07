import { expect, test, type Page } from "@playwright/test";
import { blockingViolations } from "./axe";
import { stubGoogle } from "./google";

// Lengkapi Akun (FR-11, FR-12) dengan API tiruan. Akun baru dibuat lewat kode 123456.
const unique = (prefix: string) => `${prefix}-${test.info().project.name}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@contoh.id`;

test.beforeEach(async ({ page }) => {
  await stubGoogle(page);
});

async function signInNew(page: Page, kembali?: string) {
  await page.goto(kembali ? `/masuk?kembali=${encodeURIComponent(kembali)}` : "/masuk");
  await page.getByLabel("Email").fill(unique("baru"));
  await page.getByRole("button", { name: "Kirim kode" }).click();
  await page.getByLabel("Kode 6 digit").fill("123456");
  await page.getByRole("button", { name: "Masuk", exact: true }).click();
  await expect(page).toHaveURL(/\/masuk\/lengkapi/);
  await expect(page).toHaveTitle(/^Lengkapi akun/);
}

const nameField = (page: Page) => page.getByLabel("Nama tampilan");
const consent = (page: Page) => page.getByLabel("Saya sudah membaca dan menyetujui Kebijakan Privasi AksesBogor.");
const save = (page: Page) => page.getByRole("button", { name: "Simpan dan lanjut" });

test("saves the name and consent, then returns to the page that asked for sign-in", async ({ page }) => {
  await signInNew(page, "/peta");
  await expect(page.getByRole("link", { name: /Baca Kebijakan Privasi versi 7 November 2026/ })).toHaveAttribute("target", "_blank");
  await nameField(page).fill("Sari Lestari");
  await consent(page).check();
  await save(page).click();
  await expect(page).toHaveURL(/\/peta$/);
});

test("explains a missing name and a missing consent, with focus on each", async ({ page }) => {
  await signInNew(page);
  await save(page).click();
  await expect(nameField(page)).toBeFocused();
  await expect(nameField(page)).toHaveAccessibleDescription(/Isi nama tampilan\./);

  await nameField(page).fill("Sari");
  await save(page).click();
  await expect(consent(page)).toBeFocused();
  await expect(consent(page)).toHaveAccessibleDescription("Centang persetujuan Kebijakan Privasi untuk melanjutkan.");
  await expect(nameField(page)).toHaveValue("Sari");
});

test("can be left without completing, which signs out", async ({ page }) => {
  await signInNew(page);
  await page.getByRole("button", { name: "Keluar tanpa melengkapi" }).click();
  await expect(page).toHaveURL(/\/$/);
  await page.goto("/masuk/lengkapi");
  await expect(page).toHaveURL(/\/masuk\?kembali=%2Fakun$/);
});

test("skips itself for a completed account", async ({ page }) => {
  await page.goto("/masuk");
  await page.getByLabel("Email").fill(unique("lama"));
  await page.getByRole("button", { name: "Kirim kode" }).click();
  await page.getByLabel("Kode 6 digit").fill("123456");
  await page.getByRole("button", { name: "Masuk", exact: true }).click();
  // Tunggu cookie sesi terpasang (pengalihan ke Akun Saya) sebelum membuka halaman lain.
  await expect(page).toHaveURL(/\/akun$/);
  await page.goto("/masuk/lengkapi?kembali=/jelajahi");
  await expect(page).toHaveURL(/\/jelajahi$/);
});

for (const colorScheme of ["light", "dark"] as const) {
  test(`Lengkapi Akun (${colorScheme}) has no serious or critical WCAG 2.2 AA violations, including with errors`, async ({ page }) => {
    await page.emulateMedia({ colorScheme, reducedMotion: "reduce" });
    await signInNew(page);
    expect(await blockingViolations(page)).toEqual([]);
    await save(page).click();
    await expect(page.getByText("Isi nama tampilan.")).toBeVisible();
    expect(await blockingViolations(page)).toEqual([]);
  });
}

test("Kebijakan Privasi shows the version that is agreed to and links to each section", async ({ page }) => {
  await page.goto("/kebijakan-privasi");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Kebijakan Privasi.");
  await expect(page.getByText("Versi 7 November 2026")).toBeVisible();
  await page.getByRole("navigation", { name: "Isi halaman" }).getByRole("link", { name: "Hak Anda" }).click();
  await expect(page).toHaveURL(/#hak$/);
  await expect(page.getByRole("table", { name: "Masa simpan setiap jenis data" })).toBeVisible();
});
