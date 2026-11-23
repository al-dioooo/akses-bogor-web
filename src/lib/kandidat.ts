import { CATEGORIES, type Category } from "./api";
import { LIMITS } from "./isian-laporan";
import type { LatLng } from "./laporan";

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

/** Isian awal Laporkan dari kandidat. Nilai yang salah bentuk dikosongkan; pelapor tetap bisa mengubah semuanya. */
export type CandidatePrefill = { osm: string; name: string; category: Category | ""; point: LatLng | null };

const OSM_REF = /^(node|way|relation)\/[1-9][0-9]{0,15}$/;
// Batas geser peta Peta (map/mount.ts): titik di luar itu bukan titik Kota Bogor dan diabaikan.
const AREA = { west: 106.5, south: -6.9, east: 107.1, north: -6.3 };

/** Isian dari `?osm=&nama=&kategori=&lat=&lng=`, atau null bila `osm` tidak ada atau salah bentuk. */
export function parseCandidatePrefill(params: Record<string, string | string[] | undefined>): CandidatePrefill | null {
  const one = (key: string) => {
    const value = params[key];
    return typeof value === "string" ? value.trim() : "";
  };
  const osm = one("osm");
  if (!OSM_REF.test(osm)) return null;
  const name = one("nama");
  const category = one("kategori");
  const [lat, lng] = [one("lat"), one("lng")].map((value) => (value === "" ? Number.NaN : Number(value)));
  const inArea = lat! >= AREA.south && lat! <= AREA.north && lng! >= AREA.west && lng! <= AREA.east;
  return {
    osm,
    name: name.length <= LIMITS.name && /^[^\p{C}]*$/u.test(name) ? name : "",
    category: (CATEGORIES as readonly string[]).includes(category) ? (category as Category) : "",
    point: inArea ? { lat: lat!, lng: lng! } : null,
  };
}
