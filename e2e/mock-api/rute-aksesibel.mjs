// POST /route/accessible tiruan (ADR-0055) untuk tes Playwright, meniru akses-bogor-api. Data hanya di memori.
//
// Aturan tiruan:
// - Bawaannya mati: menjawab 503 rute_aksesibel_belum_aktif, sehingga kartu rute di tes lain tetap memakai rute
//   Mapbox tiruan dari agen-rute.mjs. Hanya IP pengunjung 192.0.2.x yang mendapat rute OpenStreetMap.
// - Profil kursi_roda dari titik NO_PATH menjawab 422 tanpa_rute_kursi_roda.
// - GET /_tiruan/rute-aksesibel-terakhir?ip=... menjawab badan permintaan terakhir dari IP itu.

const HALTE_OSM = { type: "node", id: 9001, name: "Masjid Al-Hidayah", location: { lat: -6.5712, lng: 106.7655 } };
export const ACCESSIBLE_ON_PREFIX = "192.0.2.";
export const NO_PATH = { lat: -6.61, lng: 106.81 };
const lastBody = new Map();

const error = (status, galat, pesan) => [status, { galat, pesan }];

function route(from, destination, profil) {
  const to = destination.location;
  const mid = { lat: (from.lat + to.lat) / 2, lng: from.lng };
  const wheelchair = profil === "kursi_roda";
  return {
    destination,
    profil,
    distanceMeters: wheelchair ? 820 : 640,
    durationSeconds: wheelchair ? 840 : 540,
    steps: [
      { instruction: "Mulai berjalan ke arah selatan", distanceMeters: wheelchair ? 500 : 320, durationSeconds: 300, name: null, maneuver: "depart", location: from },
      { instruction: "Belok kanan ke Jalan Kapten Muslihat", distanceMeters: 320, durationSeconds: 240, name: "Jalan Kapten Muslihat", maneuver: "turn", location: mid },
      { instruction: "Tiba di tujuan", distanceMeters: 0, durationSeconds: 0, name: null, maneuver: "arrive", location: to },
    ],
    geometry: { type: "LineString", coordinates: [[from.lng, from.lat], [mid.lng, mid.lat], [to.lng, to.lat]] },
    polyline: wheelchair ? "tiruan-kursi-roda" : "tiruan-jalan-kaki",
    coverage: { sidewalkPercent: wheelchair ? 62 : 48, surfacePercent: 18, crossings: 3, crossingsWithKerb: 1, dataDate: "2026-11-25" },
    warnings: [
      ...(wheelchair ? [] : [{ code: "melewati_tangga", message: "Rute ini melewati tangga sekitar 20 m." }]),
      { code: "kerb_tinggi", message: "Ada kerb tinggi yang tercatat di 1 ruas jalur yang dilewati rute ini." },
      { code: "data_trotoar_kurang", message: `Data trotoar belum tercatat di OpenStreetMap untuk ${wheelchair ? 38 : 52}% panjang rute.` },
      { code: "data_kerb_kurang", message: "Kerb belum tercatat di 2 dari 3 penyeberangan pada rute ini." },
      ...(wheelchair ? [{ code: "kemiringan_tidak_dihitung", message: "Kemiringan jalan belum ikut dihitung; tanjakan hanya diketahui bila tercatat di OSM." }] : []),
    ],
    note: "Dihitung dari data OpenStreetMap; kondisi lapangan bisa berbeda.",
    attribution: "© kontributor OpenStreetMap (https://www.openstreetmap.org/copyright)",
  };
}

/** Menjawab rute OpenStreetMap tiruan, atau `null` bila bukan route ini. */
export function handleRuteAksesibel(method, url, headers, body, places) {
  const { pathname, searchParams } = url;
  if (method === "GET" && pathname === "/_tiruan/rute-aksesibel-terakhir") return [200, { body: lastBody.get(searchParams.get("ip")) ?? null }];
  if (method !== "POST" || pathname !== "/route/accessible") return null;
  const ip = headers["x-visitor-ip"] ?? "";
  if (!ip.startsWith(ACCESSIBLE_ON_PREFIX)) return error(503, "rute_aksesibel_belum_aktif", "Rute dari data OpenStreetMap belum diatur di server.");
  lastBody.set(ip, body);
  const from = body?.from;
  if (typeof from?.lat !== "number" || typeof from?.lng !== "number" || !["kursi_roda", "jalan_kaki"].includes(body?.profil)) {
    return error(400, "input_tidak_valid", "Data yang dikirim tidak sesuai.");
  }
  const place = places.find((p) => p.id === body?.placeId);
  const osm = body?.osm?.type === HALTE_OSM.type && body?.osm?.id === HALTE_OSM.id ? HALTE_OSM : undefined;
  const destination = place
    ? { placeId: place.id, osm: null, name: place.name, location: place.location }
    : osm
      ? { placeId: null, osm: { type: osm.type, id: osm.id }, name: osm.name, location: osm.location }
      : null;
  if (!destination) return error(404, "lokasi_tidak_ditemukan", "Lokasi tidak ditemukan.");
  if (body.profil === "kursi_roda" && from.lat === NO_PATH.lat && from.lng === NO_PATH.lng) {
    return error(422, "tanpa_rute_kursi_roda", "Tidak ditemukan rute tanpa tangga yang bisa dilewati kursi roda menurut data OpenStreetMap. Coba profil jalan kaki, lalu periksa hambatannya.");
  }
  return [200, route(from, destination, body.profil)];
}
