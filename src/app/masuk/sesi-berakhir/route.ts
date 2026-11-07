import type { NextRequest } from "next/server";
import { safeReturnPath } from "@/lib/kembali";
import { clearSession } from "@/lib/sesi";

/**
 * Sesi di cookie sudah tidak berlaku di API (kedaluwarsa, dicabut, atau akun dihapus). Halaman server tidak bisa
 * menghapus cookie, jadi pengguna lewat sini: cookie dihapus, lalu ke Masuk dengan pesan "sesi berakhir".
 */
export async function GET(request: NextRequest) {
  await clearSession();
  const target = new URL("/masuk", request.url);
  target.searchParams.set("sesi", "berakhir");
  const kembali = safeReturnPath(request.nextUrl.searchParams.get("kembali"));
  if (kembali) target.searchParams.set("kembali", kembali);
  return Response.redirect(target, 303);
}
