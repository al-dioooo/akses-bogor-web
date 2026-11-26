import type { createFormatter } from "next-intl";
import { byAdmin, type PlaceListItem } from "@/lib/api";

/** `useFormatter()` di komponen klien atau `getFormatter()` di server. */
type Format = Pick<ReturnType<typeof createFormatter>, "dateTime">;
type Place = Pick<PlaceListItem, "lastVerifiedAt" | "verifiedBy">;

/** Kunci pesan label verifikasi; setiap namespace yang menulis label punya keduanya. */
export type VerifiedKey = "verified" | "verifiedAdmin";

/** "2026-01" menjadi "Januari 2026"; kosong bila bulannya tidak ada atau tidak sah. Hanya untuk Kelola tempat. */
export function imageMonth(value: string | null | undefined, format: Format) {
  if (!value || !/^\d{4}-\d{2}$/.test(value)) return "";
  return format.dateTime(new Date(`${value}-01T00:00:00Z`), { month: "long", year: "numeric", timeZone: "UTC" });
}

/**
 * Label asal data sebuah tempat di tampilan publik: diverifikasi tim, atau diterbitkan langsung oleh admin (ADR-0051).
 * Tempat dari bukti Street View memakai label tim, dengan tanggal awal bulan gambarnya (ADR-0058); asalnya hanya
 * terlihat di Kelola tempat dan di keterangan foto.
 */
export function verifiedLabel(place: Place, format: Format, dateStyle: "medium" | "long") {
  const key: VerifiedKey = byAdmin(place) ? "verifiedAdmin" : "verified";
  return { key, values: { date: format.dateTime(new Date(place.lastVerifiedAt), { dateStyle }) } };
}
