import { expect, test, type Page } from "@playwright/test";
import { blockingViolations } from "./axe";
import { blockGoogle, stubGoogle } from "./google";

// Masuk dan Kode Masuk (FR-10, ADR-0014) dengan API tiruan: kode benar 123456, 000000 salah, 999999 kedaluwarsa.
// Setiap tes memakai email sendiri karena API tiruan dipakai bersama semua tes.
const unique = (prefix: string) => `${prefix}-${test.info().project.name}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@contoh.id`;

async function requestCode(page: Page, email: string, from = "/masuk") {
  await page.goto(from);
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: "Kirim kode" }).click();
  await expect(page).toHaveURL(/\/masuk\/kode/);
}

const codeField = (page: Page) => page.getByLabel("Kode 6 digit");

test.beforeEach(async ({ page }) => {
  await stubGoogle(page);
});

test("signs in with an emailed code and returns to the page that asked for it (FR-20)", async ({ page }) => {
  await requestCode(page, unique("lama"), "/masuk?kembali=/peta");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Cek email Anda.");
  // Kode yang ditempel dengan spasi tetap diterima.
  await codeField(page).fill("123 456");
  await page.getByRole("button", { name: "Masuk", exact: true }).click();
  await expect(page).toHaveURL(/\/peta$/);
});

test("ignores a return address on another site", async ({ page }) => {
  await requestCode(page, unique("lama"), "/masuk?kembali=//jahat.example/curi");
  await codeField(page).fill("123456");
  await page.getByRole("button", { name: "Masuk", exact: true }).click();
  await expect(page).toHaveURL(/\/akun$/);
});

test("sends a new account to Lengkapi Akun first", async ({ page }) => {
  await requestCode(page, unique("baru"), "/masuk?kembali=/peta");
  await codeField(page).fill("123456");
  await page.getByRole("button", { name: "Masuk", exact: true }).click();
  await expect(page).toHaveURL(/\/masuk\/lengkapi\?kembali=%2Fpeta$/);
});

test("explains an empty or malformed email next to the field and moves focus there", async ({ page }) => {
  await page.goto("/masuk");
  const email = page.getByLabel("Email");
  await page.getByRole("button", { name: "Kirim kode" }).click();
  await expect(email).toBeFocused();
  await expect(email).toHaveAttribute("aria-invalid", "true");
  await expect(email).toHaveAccessibleDescription(/Isi alamat email Anda\./);

  await email.fill("sari@");
  await email.press("Enter");
  await expect(page.getByText("Alamat email belum lengkap. Contoh: nama@gmail.com")).toBeVisible();
  await expect(email).toHaveValue("sari@");
});

test("shows the API message when the email cannot be sent", async ({ page }) => {
  await page.goto("/masuk");
  await page.getByLabel("Email").fill("gagal@contoh.id");
  await page.getByRole("button", { name: "Kirim kode" }).click();
  await expect(page.getByRole("main").getByRole("alert")).toHaveText("Kode belum bisa dikirim. Coba lagi sebentar lagi.");
  await expect(page).toHaveURL(/\/masuk$/);
});

test("explains a wrong or expired code, keeps it in the field, and moves focus back", async ({ page }) => {
  await requestCode(page, unique("salah"));
  const field = codeField(page);
  await field.fill("000000");
  await field.press("Enter");
  await expect(field).toBeFocused();
  await expect(field).toHaveAccessibleDescription(/Kode salah\. Sisa 4 kali percobaan\./);
  await expect(field).toHaveValue("000000");

  await field.fill("999999");
  await field.press("Enter");
  await expect(page.getByText("Kode sudah lewat 10 menit. Minta kode baru.")).toBeVisible();
});

test("asks for six digits before calling the API", async ({ page }) => {
  await requestCode(page, unique("format"));
  await codeField(page).fill("12a4");
  await codeField(page).press("Enter");
  await expect(page.getByText("Kode terdiri dari 6 angka. Periksa lagi kode di email Anda.")).toBeVisible();
});

test("keeps the resend button focusable during the 60-second pause and says how long is left", async ({ page }) => {
  await requestCode(page, unique("ulang"));
  const resend = page.getByRole("button", { name: "Kirim ulang kode" });
  await expect(resend).toHaveAttribute("aria-disabled", "true");
  await expect(resend).toHaveAccessibleDescription(/Kode baru bisa diminta dalam \d+ detik\./);
  await resend.focus();
  await expect(resend).toBeFocused();
  await resend.press("Enter");
  await expect(page.getByText("Kode baru sudah dikirim.")).toHaveCount(0);
});

test("changes the email from the code screen with the address kept", async ({ page }) => {
  const email = unique("ganti");
  await requestCode(page, email, "/masuk?kembali=/peta");
  await page.getByRole("link", { name: "Ganti email" }).click();
  await expect(page).toHaveURL(/\/masuk\?kembali=%2Fpeta$/);
  await expect(page.getByLabel("Email")).toHaveValue(email);
});

test("sends the code screen back to Masuk when no code was requested", async ({ page }) => {
  await page.goto("/masuk/kode?kembali=/peta");
  await expect(page).toHaveURL(/\/masuk\?kembali=%2Fpeta$/);
});

test("clears an expired session and says so", async ({ page, context }) => {
  await requestCode(page, unique("lama"));
  await codeField(page).fill("123456");
  await page.getByRole("button", { name: "Masuk", exact: true }).click();
  await expect(page).toHaveURL(/\/akun$/);
  expect((await context.cookies()).find((c) => c.name === "__Host-aksesbogor-sesi")).toMatchObject({ httpOnly: true, secure: true, sameSite: "Lax" });

  await page.goto("/masuk/sesi-berakhir?kembali=/peta");
  await expect(page).toHaveURL(/\/masuk\?sesi=berakhir&kembali=%2Fpeta$/);
  await expect(page.getByRole("status")).toHaveText("Sesi Anda sudah berakhir. Silakan masuk lagi.");
  expect((await context.cookies()).find((c) => c.name === "__Host-aksesbogor-sesi")).toBeUndefined();
});

for (const colorScheme of ["light", "dark"] as const) {
  test(`code screen (${colorScheme}) has no serious or critical WCAG 2.2 AA violations, including with an error`, async ({ page }) => {
    await page.emulateMedia({ colorScheme, reducedMotion: "reduce" });
    await requestCode(page, unique("axe"));
    expect(await blockingViolations(page)).toEqual([]);
    await codeField(page).fill("000000");
    await codeField(page).press("Enter");
    await expect(page.getByText("Kode salah.", { exact: false })).toBeVisible();
    expect(await blockingViolations(page)).toEqual([]);
  });
}

test.describe("Masuk dengan Google", () => {
  test("renders the Google button in Indonesian and matching the colour mode", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto("/masuk");
    await expect(page.getByRole("button", { name: "Masuk dengan Google" })).toBeVisible();
    const options = await page.evaluate(() => (window as unknown as { __gisButton: Record<string, unknown> }).__gisButton);
    expect(options).toMatchObject({ locale: "id", theme: "filled_black", text: "signin_with" });
  });

  test("signs in and suggests the Google name on Lengkapi Akun", async ({ page }) => {
    await page.goto("/masuk?kembali=/peta");
    await page.getByRole("button", { name: "Masuk dengan Google" }).click();
    await expect(page).toHaveURL(/\/masuk\/lengkapi\?kembali=%2Fpeta$/);
    await expect(page.getByLabel("Nama tampilan")).toHaveValue("Budi Santoso");
  });

  test("explains an unverified Google email", async ({ page }) => {
    await page.unroute(/accounts\.google\.com/);
    await stubGoogle(page, "tiruan-google-belum");
    await page.goto("/masuk");
    await page.getByRole("button", { name: "Masuk dengan Google" }).click();
    await expect(page.getByRole("main").getByRole("alert")).toHaveText("Email akun Google ini belum terverifikasi. Masuk dengan kode email.");
  });

  test("points to the email code when the Google script cannot load", async ({ page }) => {
    await page.unroute(/accounts\.google\.com/);
    await blockGoogle(page);
    await page.goto("/masuk");
    await expect(page.getByText("Tombol Google tidak bisa dimuat. Masuk dengan kode email di bawah.")).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
  });
});

