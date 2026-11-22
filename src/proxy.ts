import { NextResponse, type NextRequest } from "next/server";
import { placeExists } from "@/lib/api";
import { failedPlacePage } from "@/lib/halaman-gagal-dimuat";

/** Halaman 404 Detail lokasi yang dirender saat build (src/app/lokasi/tidak-ada). */
const NOT_FOUND_PATH = "/lokasi/tidak-ada";

/**
 * Status HTTP Detail lokasi (issue #150). Dengan Cache Components, kerangka halaman dikirim lebih dulu dengan status 200
 * sebelum halaman tahu lokasinya ada, dan status itu tidak bisa diubah lagi, termasuk oleh proxy. Jadi proxy mengecek
 * lokasi sebelum render: lokasi yang tidak ada atau id yang tidak valid ditulis ulang ke halaman yang sudah 404 sejak
 * build, dan galat API dijawab langsung dengan halaman 503.
 *
 * Status 404 juga diberikan pada penulisan ulang itu: bot yang hanya membaca HTML (`htmlLimitedBots`) tidak mendapat
 * hasil build, melainkan render dinamis yang memakai status dari proxy.
 */
export async function proxy(request: NextRequest) {
  // Navigasi dan prefetch di dalam aplikasi (RSC) tidak memakai status HTTP; halaman Detail menanganinya sendiri.
  if (request.headers.has("rsc")) return NextResponse.next();
  if (request.nextUrl.pathname === NOT_FOUND_PATH) return NextResponse.next({ status: 404 });
  let id: string;
  try {
    id = decodeURIComponent(request.nextUrl.pathname.slice("/lokasi/".length));
  } catch {
    return notFoundPage(request);
  }
  const found = await placeExists(id, request.headers);
  if (found === "ada") return NextResponse.next();
  if (found === "tidak_ada") return notFoundPage(request);
  return new NextResponse(failedPlacePage(request.nextUrl.pathname), {
    status: 503,
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "retry-after": "60" },
  });
}

/**
 * Tujuan rewrite harus seasal dengan `request.url`, bukan `request.nextUrl` atau header `Host`/`x-forwarded-*`: hanya
 * `request.url` yang sama persis dengan asal yang dipakai router (`skipProxyUrlNormalize` di next.config.ts). Asal
 * yang berbeda membuat Next.js memproxy rewrite ke server lain (issue #156).
 */
function notFoundPage(request: NextRequest) {
  return NextResponse.rewrite(new URL(NOT_FOUND_PATH, request.url), { status: 404 });
}

export const config = {
  // Hanya halaman Detail, bukan gambar berbagi /lokasi/:id/opengraph-image yang menangani statusnya sendiri.
  matcher: "/lokasi/:id",
};
