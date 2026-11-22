import type { NextRequest } from "next/server";
import { safeReturnPath } from "@/lib/kembali";
import { clearSession } from "@/lib/sesi";

/**
 * Sesi di cookie sudah tidak berlaku di API (kedaluwarsa, dicabut, atau akun dihapus). Halaman server tidak bisa
 * menghapus cookie, jadi pengguna lewat sini: cookie dihapus, lalu ke Masuk dengan pesan "sesi berakhir".
 *
 * Alamat tujuannya relatif. Di balik Cloudflare Tunnel, `request.url` berisi alamat server (127.0.0.1:8091), bukan
 * domain publik, jadi alamat absolut dari situ membawa pengguna keluar dari situs (issue #156).
 */
export async function GET(request: NextRequest) {
  await clearSession();
  const query = new URLSearchParams({ sesi: "berakhir" });
  const kembali = safeReturnPath(request.nextUrl.searchParams.get("kembali"));
  if (kembali) query.set("kembali", kembali);
  return new Response(null, { status: 303, headers: { location: `/masuk?${query}` } });
}
