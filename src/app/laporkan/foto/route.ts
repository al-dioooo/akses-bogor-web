import type { NextRequest } from "next/server";
import { uploadPhoto } from "@/lib/laporan";
import { apiFailure, failure, fromOtherSite, reply } from "@/lib/laporan-proxy";
import { sessionToken } from "@/lib/sesi";

const TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
/** Batas API setelah foto diperkecil di browser (ADR-0023). */
const MAX_BYTES = 3 * 1024 * 1024;

/** Unggah satu foto laporan saat "Kirim laporan" (ADR-0031, ADR-0033). Butuh sesi. */
export async function POST(request: NextRequest) {
  if (fromOtherSite(request)) return failure(403, "asal_tidak_valid", "Permintaan ini tidak berasal dari AksesBogor.");
  const token = await sessionToken();
  if (!token) return failure(401, "belum_masuk", "Masuk dulu untuk mengirim laporan.");
  const contentType = request.headers.get("content-type")?.split(";")[0]?.trim() ?? "";
  if (!TYPES.has(contentType)) return failure(415, "jenis_foto_tidak_didukung", "Foto harus berformat JPEG, PNG, atau WebP.");
  if (Number(request.headers.get("content-length") ?? 0) > MAX_BYTES) return tooLarge();
  const bytes = await request.arrayBuffer();
  if (bytes.byteLength > MAX_BYTES) return tooLarge();
  try {
    return reply(201, await uploadPhoto(token, bytes, contentType));
  } catch (error) {
    return apiFailure(error);
  }
}

const tooLarge = () => failure(413, "foto_terlalu_besar", "Foto ini terlalu besar. Batasnya 3 MB setelah diperkecil.");
