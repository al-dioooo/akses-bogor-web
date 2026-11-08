import type { NextRequest } from "next/server";
import { sendReport, type ReportPayload } from "@/lib/laporan";
import { apiFailure, failure, fromOtherSite, invalidInput, readJson, reply } from "@/lib/laporan-proxy";
import { sessionToken } from "@/lib/sesi";

/** Kirim laporan ke antrean verifikasi (FR-20 sampai FR-27). Butuh sesi; tanpa sesi web mengarahkan ke Masuk. */
export async function POST(request: NextRequest) {
  if (fromOtherSite(request)) return failure(403, "asal_tidak_valid", "Permintaan ini tidak berasal dari AksesBogor.");
  const token = await sessionToken();
  if (!token) return failure(401, "belum_masuk", "Masuk dulu untuk mengirim laporan.");
  const body = await readJson(request, 64 * 1024);
  if (!body || typeof body !== "object") return invalidInput();
  try {
    return reply(201, await sendReport(token, body as ReportPayload));
  } catch (error) {
    return apiFailure(error);
  }
}
