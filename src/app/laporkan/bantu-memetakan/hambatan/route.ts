import type { NextRequest } from "next/server";
import { routeObstacles } from "@/lib/agen-rute";
import { apiFailure, failure, fromOtherSite, invalidInput, readJson, reply } from "@/lib/laporan-proxy";
import { sessionToken } from "@/lib/sesi";

/** Hambatan yang tercatat di OpenStreetMap di dekat garis rute (ADR-0042), hanya untuk ditampilkan kepada pengguna. */
export async function POST(request: NextRequest) {
  if (fromOtherSite(request)) return failure(403, "asal_tidak_valid", "Permintaan ini tidak berasal dari AksesBogor.");
  const token = await sessionToken();
  if (!token) return failure(401, "belum_masuk", "Masuk dulu untuk melihat rute.");
  const polyline = ((await readJson(request, 64 * 1024)) as { polyline?: unknown } | null)?.polyline;
  if (typeof polyline !== "string" || polyline.length < 2 || polyline.length > 60_000) return invalidInput();
  try {
    return reply(200, await routeObstacles(token, { polyline }));
  } catch (error) {
    return apiFailure(error);
  }
}
