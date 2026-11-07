"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import type { FormState } from "@/components/akun/form-state";
import { deleteAccount, logout, renameAccount } from "@/lib/akun";
import { ApiError } from "@/lib/api";
import { withReturn } from "@/lib/kembali";
import { clearSession, sessionToken } from "@/lib/sesi";

/** Keluar: sesi dicabut di API, cookie dihapus, lalu ke Beranda. Cookie tetap dihapus bila API tidak bisa dihubungi. */
export async function signOut() {
  const token = await sessionToken();
  if (token) await logout(token).catch(() => undefined);
  await clearSession();
  redirect("/");
}

const DISPLAY_NAME_MAX = 60;

/** Ubah nama tampilan di Akun Saya (FR-12). */
export async function renameProfile(_state: FormState, form: FormData): Promise<FormState> {
  const t = await getTranslations("AkunSaya");
  const displayName = String(form.get("displayName") ?? "").trim();
  const values = { displayName };
  if (!displayName) return { error: { field: "displayName", message: t("galat.namaKosong") }, values };
  if (displayName.length > DISPLAY_NAME_MAX) return { error: { field: "displayName", message: t("galat.namaPanjang") }, values };
  const token = await sessionToken();
  if (!token) redirect(withReturn("/masuk", "/akun"));
  try {
    await renameAccount(token, displayName);
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) redirect(withReturn("/masuk/sesi-berakhir", "/akun"));
    return { error: { message: error instanceof ApiError && error.status > 0 ? error.message : t("galat.server") }, values };
  }
  // Data akun di halaman yang sama ikut memakai nama baru.
  refresh();
  return { notice: t("renamed"), values };
}

/**
 * Hapus akun (FR-13, ADR-0024): setelah centang konfirmasi, API langsung menghapus akun dan laporan yang belum terbit.
 * Cookie sesi dihapus dan pengguna diarahkan ke halaman konfirmasi.
 */
export async function deleteProfile(_state: FormState, form: FormData): Promise<FormState> {
  const t = await getTranslations("HapusAkun");
  if (form.get("confirm") !== "ya") return { error: { field: "confirm", message: t("galat.belumCentang") } };
  const token = await sessionToken();
  if (!token) redirect(withReturn("/masuk", "/akun/hapus"));
  try {
    await deleteAccount(token);
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) redirect(withReturn("/masuk/sesi-berakhir", "/akun/hapus"));
    return { error: { message: error instanceof ApiError && error.status > 0 ? error.message : t("galat.server") } };
  }
  await clearSession();
  redirect("/akun/dihapus");
}
