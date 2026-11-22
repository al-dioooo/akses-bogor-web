import type { MetadataRoute } from "next";
import { getMapPlaces } from "@/lib/api";
import { absoluteUrl, PUBLIC_PATHS } from "@/lib/situs";

/**
 * Sitemap (issue #114): halaman publik dan semua tempat yang sudah tayang. Tempat diambil dari `GET /places/map`
 * (paling banyak 2000 titik, hanya yang tayang) saat request. Bila API tidak bisa dihubungi, sitemap tetap berisi
 * halaman publik. Halaman akun, masuk, Laporkan, dan verifikasi tidak pernah dimuat.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages = PUBLIC_PATHS.map((path) => ({ url: absoluteUrl(path) }));
  const places = await getMapPlaces()
    .then(({ features }) => features.map((feature) => ({ url: absoluteUrl(`/lokasi/${encodeURIComponent(feature.id)}`) })))
    .catch(() => []);
  return [...pages, ...places];
}
