import type { Category, MapFeature, Status } from "@/lib/api";

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
