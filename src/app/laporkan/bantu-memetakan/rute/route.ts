import type { NextRequest } from "next/server";
import { walkingRoute } from "@/lib/agen-rute";
import { pointFrom, routeTargetFrom } from "@/lib/agen-rute-isian";
import { apiFailure, failure, fromOtherSite, invalidInput, readJson, reply } from "@/lib/laporan-proxy";
import { profileFrom } from "@/lib/rute-aksesibel";
import { accessibleRoute } from "@/lib/rute-aksesibel-api";
import { sessionToken } from "@/lib/sesi";

/**
 * Rute jalan kaki dari titik awal pengguna ke lokasi AksesBogor atau fasilitas OpenStreetMap (ADR-0042). Titik awal
 * hanya diteruskan ke API, yang membulatkannya untuk Mapbox Directions atau, dengan `profil`, untuk Valhalla di server
 * AksesBogor (ADR-0055); tidak disimpan dan tidak pernah dikirim ke agen.
 */
export async function POST(request: NextRequest) {
  if (fromOtherSite(request)) return failure(403, "asal_tidak_valid", "Permintaan ini tidak berasal dari AksesBogor.");
  const token = await sessionToken();
  if (!token) return failure(401, "belum_masuk", "Masuk dulu untuk melihat rute.");
  const body = (await readJson(request, 1024)) as { from?: unknown } | null;
  const from = pointFrom(body?.from);
  const target = routeTargetFrom(body);
  const profil = profileFrom(body);
  if (!from || !target || profil === null) return invalidInput();
  try {
    // Dengan profil: rute OpenStreetMap (ADR-0055). Tanpa profil: rute jalan kaki Mapbox seperti sebelumnya.
    return reply(200, profil ? await accessibleRoute(token, { from, ...target, profil }) : await walkingRoute(token, { from, ...target }));
  } catch (error) {
    return apiFailure(error);
  }
}
