"use server";

import { getPlace, type PlaceDetail } from "@/lib/api";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Data lokasi terbaru untuk draf Laporkan yang ditolak terbit langsung karena lokasi sudah berubah (`draf_usang`,
 * ADR-0051). Datanya sama dengan Detail publik dan selalu diambil saat diminta. `null` bila lokasi tidak ada lagi atau
 * API tidak bisa dihubungi.
 */
export async function currentPlace(id: string): Promise<PlaceDetail | null> {
  if (typeof id !== "string" || !UUID.test(id)) return null;
  return getPlace(id).catch(() => null);
}
