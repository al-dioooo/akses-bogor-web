import type { CandidateFeature, Category, MapFeature, Status } from "@/lib/api";

/** Titik peta yang dipakai komponen Peta, tanpa bungkus GeoJSON. */
export type MapPlace = { id: string; name: string; category: Category; status: Status; lng: number; lat: number };

/**
 * Urut dari utara ke selatan, lalu barat ke timur, supaya urutan daftar dan urutan Tab di antara marker
 * mengikuti arah baca peta.
 */
export function toMapPlaces(features: MapFeature[]): MapPlace[] {
  return features
    .map(({ id, geometry, properties }) => ({ id, ...properties, lng: geometry.coordinates[0], lat: geometry.coordinates[1] }))
    .sort((a, b) => b.lat - a.lat || a.lng - b.lng);
}

/** Kandidat "Belum ada data" (ADR-0049) yang dipakai komponen Peta. `id` adalah tipe dan id OSM, mis. `node/1`. */
export type MapCandidate = {
  id: string;
  osmType: CandidateFeature["properties"]["osmType"];
  osmId: number;
  name: string | null;
  category: Category;
  district: string;
  wheelchair: string | null;
  lng: number;
  lat: number;
};

/** Urut nama, lalu tempat tanpa nama di belakang, supaya daftar kandidat mudah dibaca. */
export function toMapCandidates(features: CandidateFeature[]): MapCandidate[] {
  return features
    .map(({ id, geometry, properties: { district, ...rest } }) => ({ id, ...rest, district: district.name, lng: geometry.coordinates[0], lat: geometry.coordinates[1] }))
    .sort((a, b) => (a.name === null) !== (b.name === null) ? (a.name === null ? 1 : -1) : (a.name ?? "").localeCompare(b.name ?? "", "id") || a.id.localeCompare(b.id));
}
