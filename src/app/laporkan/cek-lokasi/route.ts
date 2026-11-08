import type { NextRequest } from "next/server";
import { checkLocation } from "@/lib/laporan";
import { apiFailure, invalidInput, readJson, reply } from "@/lib/laporan-proxy";

/** Cek titik laporan: kecamatan, cakupan Kota Bogor, dan lokasi mirip (FR-22, FR-23). Tanpa akun (ADR-0033). */
export async function POST(request: NextRequest) {
  const body = await readJson(request, 4096);
  if (!body || typeof body !== "object") return invalidInput();
  try {
    return reply(200, await checkLocation(body as Parameters<typeof checkLocation>[0]));
  } catch (error) {
    return apiFailure(error);
  }
}
