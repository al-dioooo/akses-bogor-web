import type { NextRequest } from "next/server";
import { askAgen } from "@/lib/agen";
import { assistantAskFrom } from "@/lib/agen-rute-isian";
import { apiFailure, failure, fromOtherSite, invalidInput, readJson, reply } from "@/lib/laporan-proxy";
import { sessionToken } from "@/lib/sesi";

/**
 * Pertanyaan ke Agen AI (ADR-0054), dengan atau tanpa sesi. Yang diteruskan: pertanyaan, giliran sebelumnya dari
 * browser, id lokasi bila ada, dan titik awal bila pengunjung memilihnya. API memakai titik awal hanya untuk tempat
 * terdekat dan tidak mengirimnya ke model. Tidak ada yang disimpan di server web.
 */
export async function POST(request: NextRequest) {
  if (fromOtherSite(request)) return failure(403, "asal_tidak_valid", "Permintaan ini tidak berasal dari AksesBogor.");
  const input = assistantAskFrom(await readJson(request, 16 * 1024));
  if (!input) return invalidInput();
  try {
    return reply(200, await askAgen(await sessionToken(), input));
  } catch (error) {
    return apiFailure(error);
  }
}
