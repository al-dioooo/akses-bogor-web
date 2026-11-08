import type { NextRequest } from "next/server";
import { searchPlaces } from "@/lib/laporan";
import { apiFailure, invalidInput, readJson, reply } from "@/lib/laporan-proxy";

/** Pencarian tempat untuk pemilih lokasi (ADR-0032). Tanpa akun; kata kunci tidak dicatat di URL. */
export async function POST(request: NextRequest) {
  const body = await readJson(request, 2048);
  if (!body || typeof body !== "object") return invalidInput();
  try {
    return reply(200, await searchPlaces(body as Parameters<typeof searchPlaces>[0]));
  } catch (error) {
    return apiFailure(error);
  }
}
