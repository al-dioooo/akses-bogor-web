"use server";

import { redirect } from "next/navigation";
import { logout } from "@/lib/akun";
import { clearSession, sessionToken } from "@/lib/sesi";

/** Keluar: sesi dicabut di API, cookie dihapus, lalu ke Beranda. Cookie tetap dihapus bila API tidak bisa dihubungi. */
export async function signOut() {
  const token = await sessionToken();
  if (token) await logout(token).catch(() => undefined);
  await clearSession();
  redirect("/");
}
