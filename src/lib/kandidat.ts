import type { Category } from "./api";

// Kandidat "Belum ada data" dari OpenStreetMap (ADR-0049): bukan lokasi AksesBogor, tanpa status. Yang ada di sini
// hanya cara membawa kandidat ke Laporkan dan cara membaca tag wheelchair OSM sebagai keterangan dari OSM.

type ReportSource = { osmType: "node" | "way" | "relation"; osmId: number; name: string | null; category: Category; lat: number; lng: number };

/**
 * Laporkan tempat ini: laporan baru yang terisi nama, kategori, titik OSM sebagai pin awal, dan id OSM. Pelapor tetap
 * memindahkan pin ke pintu masuk utama dan mengonfirmasinya.
 */
export function candidateReportHref(candidate: ReportSource) {
  const params = new URLSearchParams({ osm: `${candidate.osmType}/${candidate.osmId}` });
  if (candidate.name) params.set("nama", candidate.name);
  params.set("kategori", candidate.category);
  params.set("lat", candidate.lat.toFixed(6));
  params.set("lng", candidate.lng.toFixed(6));
  return `/laporkan?${params}`;
}

/** Nilai tag wheelchair OSM yang punya teks sendiri; nilai lain ditampilkan apa adanya. */
export const WHEELCHAIR_VALUES = ["yes", "limited", "no", "designated"] as const;
export type WheelchairValue = (typeof WHEELCHAIR_VALUES)[number];

export const knownWheelchair = (value: string): value is WheelchairValue => (WHEELCHAIR_VALUES as readonly string[]).includes(value);

export const osmUrl = (candidate: Pick<ReportSource, "osmType" | "osmId">) => `https://www.openstreetmap.org/${candidate.osmType}/${candidate.osmId}`;
