import type { createFormatter } from "next-intl";
import { byAdmin, byStreetView, type PlaceListItem } from "@/lib/api";

/** `useFormatter()` di komponen klien atau `getFormatter()` di server. */
type Format = Pick<ReturnType<typeof createFormatter>, "dateTime">;
type Place = Pick<PlaceListItem, "lastVerifiedAt" | "verifiedBy" | "verificationSource" | "streetViewImageDate">;

/** Kunci pesan label verifikasi; setiap namespace yang menulis label punya ketiganya. */
export type VerifiedKey = "verified" | "verifiedAdmin" | "verifiedStreetView";

/** "2026-01" menjadi "Januari 2026"; kosong bila bulannya tidak ada atau tidak sah. */
export function imageMonth(value: string | null | undefined, format: Format) {
  if (!value || !/^\d{4}-\d{2}$/.test(value)) return "";
  return format.dateTime(new Date(`${value}-01T00:00:00Z`), { month: "long", year: "numeric", timeZone: "UTC" });
}

/**
 * Label asal data sebuah tempat: diverifikasi tim, diterbitkan langsung oleh admin (ADR-0051), atau diverifikasi dari
 * Street View dengan bulan gambarnya (ADR-0057). Tempat Street View tidak pernah diberi label "Diverifikasi" saja.
 */
export function verifiedLabel(place: Place, format: Format, dateStyle: "medium" | "long") {
  const date = format.dateTime(new Date(place.lastVerifiedAt), { dateStyle });
  const key: VerifiedKey = byAdmin(place) ? "verifiedAdmin" : byStreetView(place) ? "verifiedStreetView" : "verified";
  return { key, values: { date, month: imageMonth(place.streetViewImageDate, format) || "none" } };
}
