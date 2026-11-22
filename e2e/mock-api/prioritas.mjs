// Route prioritas kecamatan tiruan (/districts/priority, /districts/boundaries) untuk tes Playwright, meniru
// akses-bogor-api (ADR-0043, ADR-0034). Prioritas dibuka, kecuali untuk IP pengunjung 203.0.113.251 yang mendapat 503
// data_disabilitas_belum_aktif. Batas kecamatan tiruan berupa enam persegi di sekitar Kota Bogor.
import { PRIORITY } from "./agen-rute.mjs";

export const PRIORITY_OFF_IP = "203.0.113.251";

const box = (west, south, east, north) => ({ type: "Polygon", coordinates: [[[west, south], [east, south], [east, north], [west, north], [west, south]]] });
const BOUNDARIES = {
  type: "FeatureCollection",
  features: [
    ["tanah-sareal", "Tanah Sareal", box(106.76, -6.57, 106.79, -6.53)],
    ["bogor-utara", "Bogor Utara", box(106.79, -6.57, 106.83, -6.53)],
    ["bogor-barat", "Bogor Barat", box(106.73, -6.61, 106.78, -6.57)],
    ["bogor-tengah", "Bogor Tengah", box(106.78, -6.61, 106.81, -6.57)],
    ["bogor-timur", "Bogor Timur", box(106.81, -6.61, 106.85, -6.57)],
    ["bogor-selatan", "Bogor Selatan", box(106.77, -6.68, 106.84, -6.61)],
  ].map(([slug, name, geometry]) => ({ type: "Feature", properties: { slug, name }, geometry })),
  attribution: "© kontributor OpenStreetMap",
};

/** Menjawab route prioritas kecamatan, atau `null` bila bukan route itu. */
export function handlePrioritas(method, pathname, headers) {
  if (method !== "GET") return null;
  if (pathname === "/districts/boundaries") return [200, BOUNDARIES, { "cache-control": "public, max-age=86400" }];
  if (pathname !== "/districts/priority") return null;
  if (headers["x-visitor-ip"] === PRIORITY_OFF_IP) return [503, { galat: "data_disabilitas_belum_aktif", pesan: "Data prioritas kecamatan belum dibuka." }];
  return [200, PRIORITY];
}
