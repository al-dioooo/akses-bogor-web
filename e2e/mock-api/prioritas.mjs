// Route prioritas kecamatan tiruan (/districts/priority, /districts/boundaries, /districts/disability) untuk tes Playwright, meniru
// akses-bogor-api (ADR-0043, ADR-0034). Prioritas dibuka, kecuali untuk IP pengunjung 203.0.113.251 yang mendapat 503
// data_disabilitas_belum_aktif. Batas kecamatan tiruan berupa enam persegi di sekitar Kota Bogor, dengan garis luarnya.
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
  // Garis luar gabungan keenam persegi (ADR-0053).
  outline: {
    type: "MultiPolygon",
    coordinates: [
      [
        [
          [106.76, -6.53],
          [106.83, -6.53],
          [106.83, -6.57],
          [106.85, -6.57],
          [106.85, -6.61],
          [106.84, -6.61],
          [106.84, -6.68],
          [106.77, -6.68],
          [106.77, -6.61],
          [106.73, -6.61],
          [106.73, -6.57],
          [106.76, -6.57],
          [106.76, -6.53],
        ],
      ],
    ],
  },
};

const SLUGS = BOUNDARIES.features.map((f) => [f.properties.slug, f.properties.name]);
const CATEGORIES = ["fisik", "netra", "mental", "lainnya"];
/**
 * Jumlah terdaftar tiruan (GET /districts/disability, ADR-0053): Bogor Barat terbanyak; tahun 2024 melonjak dari 2023.
 * Bogor Tengah tanpa angka "lainnya" pada 2022.
 */
const DISABILITY = {
  years: [2022, 2023, 2024],
  categories: CATEGORIES,
  districts: SLUGS.map(([slug, name], d) => ({
    slug,
    name,
    counts: [2022, 2023, 2024].flatMap((year, y) =>
      CATEGORIES.flatMap((category, c) => (slug === "bogor-tengah" && year === 2022 && category === "lainnya" ? [] : [{ year, category, count: (slug === "bogor-barat" ? 300 : 40 * (d + 1)) * (y + 1) + c * 7 }])),
    ),
  })),
  caveat:
    "Angka ini jumlah penyandang disabilitas yang terdaftar di Dinas Sosial Kota Bogor, bukan jumlah seluruh penyandang disabilitas. Jumlahnya melonjak besar antartahun, jadi angka antartahun belum bisa dibandingkan langsung.",
  source: PRIORITY.source,
};

/** Menjawab route prioritas kecamatan dan data disabilitas, atau `null` bila bukan route itu. */
export function handlePrioritas(method, pathname, headers) {
  if (method !== "GET") return null;
  if (pathname === "/districts/boundaries") return [200, BOUNDARIES, { "cache-control": "public, max-age=86400" }];
  if (pathname === "/districts/disability") {
    if (headers["x-visitor-ip"] === PRIORITY_OFF_IP) return [503, { galat: "data_disabilitas_belum_aktif", pesan: "Data disabilitas belum dibuka." }];
    return [200, DISABILITY];
  }
  if (pathname !== "/districts/priority") return null;
  if (headers["x-visitor-ip"] === PRIORITY_OFF_IP) return [503, { galat: "data_disabilitas_belum_aktif", pesan: "Data prioritas kecamatan belum dibuka." }];
  return [200, PRIORITY];
}
