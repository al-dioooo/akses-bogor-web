import type { NextRequest } from "next/server";
import { apiFailure, failure, fromOtherSite, invalidInput, readJson, reply } from "@/lib/laporan-proxy";
import { sessionToken } from "@/lib/sesi";
import { visitorRouteObstacles } from "@/lib/tanya-rute";

/** Hambatan OpenStreetMap di dekat garis rute untuk kartu rute asisten (ADR-0050), hanya untuk ditampilkan. */
export async function POST(request: NextRequest) {
  if (fromOtherSite(request)) return failure(403, "asal_tidak_valid", "Permintaan ini tidak berasal dari AksesBogor.");
  const polyline = ((await readJson(request, 64 * 1024)) as { polyline?: unknown } | null)?.polyline;
  if (typeof polyline !== "string" || polyline.length < 2 || polyline.length > 60_000) return invalidInput();
  try {
    return reply(200, await visitorRouteObstacles(await sessionToken(), { polyline }));
  } catch (error) {
    return apiFailure(error);
  }
}
