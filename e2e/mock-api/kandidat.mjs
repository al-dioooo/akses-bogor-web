// Kandidat "Belum ada data" tiruan (GET /places/candidates) untuk tes Playwright, meniru akses-bogor-api (ADR-0049):
// tempat OpenStreetMap tanpa lokasi AksesBogor, tanpa status, dengan tag wheelchair mentah dan sumber ODbL. Kandidat
// pertama tepat di tengah Kota Bogor (tengah tampilan awal), supaya tes bisa mengekliknya di peta. Jumlahnya 24.
const district = (slug, name) => ({ slug, name });
const candidate = (osmType, osmId, name, category, [lng, lat], where, wheelchair = null) => ({
  type: "Feature",
  id: `${osmType}/${osmId}`,
  geometry: { type: "Point", coordinates: [lng, lat] },
  properties: { osmType, osmId, name, category, district: where, wheelchair },
});

export const CANDIDATES = [
  candidate("node", 9001, "Masjid kandidat A", "masjid", [106.79, -6.595], district("bogor-tengah", "Bogor Tengah"), "limited"),
  candidate("way", 9002, "Kampus kandidat B", "kampus", [106.775, -6.555], district("tanah-sareal", "Tanah Sareal")),
  candidate("node", 9003, null, "halte", [106.815, -6.575], district("bogor-utara", "Bogor Utara"), "yes"),
  candidate("node", 9004, "Rumah sakit kandidat C", "rumah_sakit", [106.805, -6.64], district("bogor-selatan", "Bogor Selatan"), "no"),
  // Dua puluh halte tanpa nama berderet jauh dari tengah, supaya daftar di panel perlu "Tampilkan lagi".
  ...Array.from({ length: 20 }, (_, i) => candidate("node", 9101 + i, null, "halte", [106.82 + i * 0.001, -6.62], district("bogor-selatan", "Bogor Selatan"))),
];

const SOURCE = {
  title: "Kampus, masjid, halte, dan rumah sakit di Kota Bogor (OpenStreetMap)",
  license: "Open Database License (ODbL) 1.0",
  attribution: "© kontributor OpenStreetMap",
  url: "https://www.openstreetmap.org/copyright",
  retrievedAt: "2026-11-22T10:00:00.000Z",
};

const csv = (value) => (value ? value.split(",").filter(Boolean) : []);

/** Menjawab GET /places/candidates dengan filter nama, kategori, dan kecamatan, atau `null` bila bukan route itu. */
export function handleKandidat(method, url) {
  if (method !== "GET" || url.pathname !== "/places/candidates") return null;
  const q = url.searchParams.get("q")?.toLowerCase();
  const [category, districts] = ["category", "district"].map((key) => csv(url.searchParams.get(key)));
  const features = CANDIDATES.filter(({ properties: p }) => !q || p.name?.toLowerCase().includes(q))
    .filter(({ properties: p }) => !category.length || category.includes(p.category))
    .filter(({ properties: p }) => !districts.length || districts.includes(p.district.slug));
  return [200, { type: "FeatureCollection", features, source: SOURCE }, { "cache-control": "public, max-age=300" }];
}
