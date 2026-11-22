import type { NextRequest } from "next/server";
import { walkingRoute } from "@/lib/agen-rute";
import { isPlaceId, pointFrom } from "@/lib/agen-rute-isian";
import { apiFailure, failure, fromOtherSite, invalidInput, readJson, reply } from "@/lib/laporan-proxy";
import { sessionToken } from "@/lib/sesi";

/**
 * Rute jalan kaki dari titik awal pengguna ke lokasi ini (ADR-0042). Titik awal hanya diteruskan ke API, yang
 * membulatkannya dan memakainya untuk Mapbox Directions; tidak disimpan dan tidak pernah dikirim ke model.
 */
export async function POST(request: NextRequest, ctx: RouteContext<"/lokasi/[id]/rute/jalan-kaki">) {
  if (fromOtherSite(request)) return failure(403, "asal_tidak_valid", "Permintaan ini tidak berasal dari AksesBogor.");
  const token = await sessionToken();
  if (!token) return failure(401, "belum_masuk", "Masuk dulu untuk melihat rute.");
  const { id } = await ctx.params;
  const from = pointFrom(((await readJson(request, 1024)) as { from?: unknown } | null)?.from);
  if (!isPlaceId(id) || !from) return invalidInput();
  try {
    return reply(200, await walkingRoute(token, { from, placeId: id }));
  } catch (error) {
    return apiFailure(error);
  }
}
