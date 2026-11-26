import type { NextRequest } from "next/server";
import { ApiError } from "./api";
import { configuredSiteUrl } from "./situs";

// Bantuan untuk route handler /laporkan/*: browser hanya berbicara dengan server web, yang meneruskan ke API
// (ADR-0029). Jawaban tidak disimpan cache dan galat API diteruskan dalam bentuk `{ galat, pesan }`.

const NO_STORE = { "cache-control": "no-store" };

export const reply = (status: number, body: unknown, headers: Record<string, string> = {}) =>
  Response.json(body, { status, headers: { ...NO_STORE, ...headers } });

export const failure = (status: number, galat: string, pesan: string) => reply(status, { galat, pesan });

type Env = Record<string, string | undefined>;

// Penanda di globalThis, karena setiap bundle route handler memuat salinan modul ini.
const WARNED = Symbol.for("aksesbogor.laporanProxy.siteUrlKosong");

/**
 * Permintaan dari situs lain ditolak (CSRF). Cookie sesi `SameSite=Lax` sudah tidak terkirim pada POST lintas situs;
 * ini lapisan kedua untuk route yang memakai sesi.
 *
 * Header `Origin`, atau `Referer` bila `Origin` tidak ada, harus salah satu asal tepercaya (issue #165):
 * - asal `SITE_URL`, yaitu domain publik situs;
 * - asal server sendiri (`request.nextUrl.origin`), untuk pengembangan lokal dan tes. Asal ini dibangun dari alamat
 *   bind dan port server, bukan dari header `Host` atau `x-forwarded-host`, jadi tidak bisa dipalsukan situs lain. Di
 *   balik Cloudflare Tunnel nilainya alamat server (`https://localhost:8091`), bukan domain publik, sehingga dulu
 *   permintaan yang sah selalu ditolak.
 *
 * Produksi tanpa `SITE_URL` menolak semua permintaan yang membawa asal, dengan pesan di log, supaya kesalahan
 * konfigurasi terlihat dan tidak membuka celah. Permintaan tanpa `Origin` dan `Referer` bukan dari browser, jadi bukan
 * CSRF. Route memanggil `fromOtherSite(request)`; `env` hanya untuk tes.
 */
export function fromOtherSite(request: NextRequest, env: Env = process.env) {
  const site = request.headers.get("sec-fetch-site");
  if (site && site !== "same-origin") return true;
  const origin = requestOrigin(request);
  return origin !== null && !trustedOrigins(request, env).includes(origin);
}

function requestOrigin(request: NextRequest): string | null {
  const origin = request.headers.get("origin");
  if (origin !== null) return origin;
  const referer = request.headers.get("referer");
  if (!referer) return null;
  try {
    return new URL(referer).origin;
  } catch {
    return "null";
  }
}

function trustedOrigins(request: NextRequest, env: Env): string[] {
  const site = configuredSiteUrl(env);
  if (site) return [site.origin, request.nextUrl.origin];
  if (env.NODE_ENV !== "production") return [request.nextUrl.origin];
  warnMissingSiteUrl();
  return [];
}

function warnMissingSiteUrl() {
  const flags = globalThis as { [WARNED]?: boolean };
  if (flags[WARNED]) return;
  flags[WARNED] = true;
  console.error(
    "SITE_URL kosong: kirim laporan, unggah foto, dan Agen AI menolak semua permintaan dari browser (403), " +
      "karena asal situs tidak diketahui. Isi SITE_URL di /etc/akses-bogor/web.env, lalu deploy ulang.",
  );
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
