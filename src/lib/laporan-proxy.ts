import type { NextRequest } from "next/server";
import { ApiError } from "./api";

// Bantuan untuk route handler /laporkan/*: browser hanya berbicara dengan server web, yang meneruskan ke API
// (ADR-0029). Jawaban tidak disimpan cache dan galat API diteruskan dalam bentuk `{ galat, pesan }`.

const NO_STORE = { "cache-control": "no-store" };

export const reply = (status: number, body: unknown, headers: Record<string, string> = {}) =>
  Response.json(body, { status, headers: { ...NO_STORE, ...headers } });

export const failure = (status: number, galat: string, pesan: string) => reply(status, { galat, pesan });

/**
 * Permintaan dari situs lain ditolak. Cookie sesi `SameSite=Lax` sudah tidak terkirim pada POST lintas situs; ini
 * lapisan kedua untuk route yang memakai sesi.
 */
export function fromOtherSite(request: NextRequest) {
  const site = request.headers.get("sec-fetch-site");
  if (site && site !== "same-origin") return true;
  const origin = request.headers.get("origin");
  return origin !== null && origin !== request.nextUrl.origin;
}

/** Badan JSON dengan batas ukuran; null bila terlalu besar atau bukan JSON. */
export async function readJson(request: Request, maxBytes: number): Promise<unknown> {
  const text = await request.text();
  if (text.length > maxBytes) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export const invalidInput = () => failure(400, "input_tidak_valid", "Data yang dikirim tidak sesuai. Periksa lagi isiannya.");

/** Galat dari API diteruskan dengan status dan `retry-after`-nya; API yang tidak terhubung menjadi 502. */
export function apiFailure(error: unknown) {
  if (!(error instanceof ApiError)) throw error;
  const headers: Record<string, string> = error.retryAfterSeconds ? { "retry-after": String(error.retryAfterSeconds) } : {};
  return reply(error.status > 0 ? error.status : 502, { galat: error.galat, pesan: error.message }, headers);
}
