import type { NextRequest } from "next/server";
import { askAgent } from "@/lib/agen-rute";
import { askFrom } from "@/lib/agen-rute-isian";
import { apiFailure, failure, fromOtherSite, invalidInput, readJson, reply } from "@/lib/laporan-proxy";
import { sessionToken } from "@/lib/sesi";

/**
 * Pertanyaan ke agen bantu memetakan (ADR-0043). Yang diteruskan hanya pertanyaan, giliran sebelumnya dari browser, dan
 * id lokasi bila ada; posisi dan rute pengguna tidak pernah ikut. Tidak ada yang disimpan di server web.
 */
export async function POST(request: NextRequest) {
  if (fromOtherSite(request)) return failure(403, "asal_tidak_valid", "Permintaan ini tidak berasal dari AksesBogor.");
  const token = await sessionToken();
  if (!token) return failure(401, "belum_masuk", "Masuk dulu untuk bertanya kepada agen.");
  const input = askFrom(await readJson(request, 16 * 1024));
  if (!input) return invalidInput();
  try {
    return reply(200, await askAgent(token, input));
  } catch (error) {
    return apiFailure(error);
  }
}
