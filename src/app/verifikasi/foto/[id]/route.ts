import type { NextRequest } from "next/server";
import { failure } from "@/lib/laporan-proxy";
import { sessionToken } from "@/lib/sesi";
import { fetchReviewPhoto } from "@/lib/verifikasi";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Foto laporan yang belum terbit untuk verifikator (ADR-0031, ADR-0037). Sesi dan peran diperiksa API; berkasnya
 * diteruskan tanpa disimpan di cache mana pun. `?versi=kabur` menampilkan pratinjau area kabur.
 */
export async function GET(request: NextRequest, { params }: RouteContext<"/verifikasi/foto/[id]">) {
  const { id } = await params;
  if (!UUID.test(id)) return failure(404, "foto_tidak_ditemukan", "Foto ini tidak ditemukan.");
  const token = await sessionToken();
  if (!token) return failure(401, "belum_masuk", "Masuk dulu sebagai verifikator.");
  const versi = request.nextUrl.searchParams.get("versi") === "kabur" ? "kabur" : "asli";
  const upstream = await fetchReviewPhoto(token, id, versi);
  if (!upstream) return failure(502, "api_tidak_terhubung", "Server AksesBogor tidak bisa dihubungi.");
  if (!upstream.ok) {
    const body = (await upstream.json().catch(() => null)) as { galat?: string; pesan?: string } | null;
    return failure(upstream.status, body?.galat ?? "galat_api", body?.pesan ?? "Foto gagal dimuat.");
  }
  return new Response(upstream.body, {
    status: 200,
    headers: { "content-type": upstream.headers.get("content-type") ?? "image/webp", "cache-control": "private, no-store" },
  });
}
