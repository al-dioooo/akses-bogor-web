import type { NextRequest } from "next/server";
import { pointFrom, routeTargetFrom } from "@/lib/agen-rute-isian";
import { apiFailure, failure, fromOtherSite, invalidInput, readJson, reply } from "@/lib/laporan-proxy";
import { sessionToken } from "@/lib/sesi";
import { visitorWalkingRoute } from "@/lib/tanya-rute";

/**
 * Rute jalan kaki dari titik awal pengunjung ke lokasi AksesBogor atau kandidat OpenStreetMap (ADR-0049) untuk kartu
 * rute asisten (ADR-0050), dengan atau tanpa sesi. Titik awal hanya diteruskan ke API, yang membulatkannya untuk Mapbox Directions; tidak disimpan.
 */
export async function POST(request: NextRequest) {
  if (fromOtherSite(request)) return failure(403, "asal_tidak_valid", "Permintaan ini tidak berasal dari AksesBogor.");
  const body = (await readJson(request, 1024)) as { from?: unknown } | null;
  const from = pointFrom(body?.from);
  const target = routeTargetFrom(body);
  if (!from || !target) return invalidInput();
  try {
    return reply(200, await visitorWalkingRoute(await sessionToken(), { from, ...target }));
  } catch (error) {
    return apiFailure(error);
  }
}
