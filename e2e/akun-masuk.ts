import { expect, type Page } from "@playwright/test";
import { mockApiPort } from "../playwright.config";

// Masuk lewat layar Masuk dan Kode Masuk dengan API tiruan (kode 123456). Awalan email menentukan jenis akun tiruan:
// lama- (lengkap, tanpa laporan), pelapor- (lengkap, empat laporan contoh), baru- (belum lengkap).
export const uniqueEmail = (prefix: string, project: string) =>
  `${prefix}-${project}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@contoh.id`;

export async function signIn(page: Page, email: string, from = "/masuk") {
  await page.goto(from);
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: "Kirim kode" }).click();
  await page.getByLabel("Kode 6 digit").fill("123456");
  await page.getByRole("button", { name: "Masuk", exact: true }).click();
  await expect(page).not.toHaveURL(/\/masuk\/kode/);
}

/** Alamat API tiruan untuk tes yang mengubah atau membaca keadaannya langsung. */
export const mockApi = () => process.env.MOCK_API_URL ?? `http://localhost:${mockApiPort}`;
