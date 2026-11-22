// Route agen rute tiruan (/agent/tools, /route/walking, /route/obstacles, /agent/ask) untuk tes Playwright, meniru
// akses-bogor-api (ADR-0042, ADR-0043). Data hanya di memori.
//
// Aturan tiruan:
// - Agen rute dibuka, kecuali untuk IP pengunjung 203.0.113.250: semua route agen menjawab 503 agen_rute_belum_aktif,
//   supaya tes "tersembunyi" tidak mengganggu tes lain yang berjalan bersamaan.
// - Titik awal di luar kotak Kota Bogor menjawab 422 di_luar_kota_bogor. Rute tiruan berupa garis lurus tiga langkah
//   dari titik awal ke lokasi, dengan dua hambatan OpenStreetMap.
// - Pertanyaan yang memuat "sibuk-tiruan" menjawab 503 agen_sibuk, dan "batas-tiruan" menjawab 429.
// - GET /_tiruan/agen-terakhir?email=... menjawab badan /agent/ask terakhir dari akun itu, untuk memastikan posisi
//   pengguna tidak pernah ikut terkirim.
import { userFromToken } from "./akun.mjs";

export const AGENT_OFF_IP = "203.0.113.250";
const BOX = { west: 106.7348, east: 106.8486, south: -6.6813, north: -6.5143 };
const lastQuestion = new Map();

const error = (status, galat, pesan) => [status, { galat, pesan }];
const inside = ({ lat, lng }) => lng >= BOX.west && lng <= BOX.east && lat >= BOX.south && lat <= BOX.north;
const WARNING =
  "Rute ini rute jalan kaki dari Mapbox. Rute ini tidak memperhitungkan tangga, trotoar, kerb, atau kemiringan jalan, jadi belum tentu bisa dilewati kursi roda.";

function route(from, place) {
  const to = place.location;
  const mid = { lat: (from.lat + to.lat) / 2, lng: from.lng };
  const leg = (a, b) => Math.round(Math.hypot((b.lng - a.lng) * 110_000, (b.lat - a.lat) * 110_000));
  const first = leg(from, mid);
  const second = leg(mid, to);
  return {
    destination: { placeId: place.id, name: place.name, location: to },
    distanceMeters: first + second,
    durationSeconds: Math.round((first + second) / 1.3),
    steps: [
      { instruction: "Berjalan ke selatan di Jalan Contoh", distanceMeters: first, durationSeconds: Math.round(first / 1.3), name: "Jalan Contoh", maneuver: "depart", location: from },
      { instruction: "Belok kiri ke Jalan Pajajaran", distanceMeters: second, durationSeconds: Math.round(second / 1.3), name: "Jalan Pajajaran", maneuver: "turn", location: mid },
      { instruction: "Anda tiba di tujuan, di sebelah kanan", distanceMeters: 0, durationSeconds: 0, name: null, maneuver: "arrive", location: to },
    ],
    geometry: { type: "LineString", coordinates: [from, mid, to].map((p) => [p.lng, p.lat]) },
    polyline: "tiruan",
    warning: WARNING,
    attribution: "© Mapbox © OpenStreetMap",
  };
}

const OBSTACLES = {
  bufferMeters: 20,
  truncated: false,
  features: [
    {
      kind: "kerb",
      description: "Kerb tinggi",
      name: null,
      tags: { kerb: "raised" },
      distanceFromRouteMeters: 3,
      alongRouteMeters: 40,
      osm: { type: "node", id: 2, url: "https://www.openstreetmap.org/node/2" },
    },
    {
      kind: "tangga",
      description: "Tangga, 4 anak tangga, tanpa ramp",
      name: null,
      tags: { highway: "steps", step_count: "4" },
      distanceFromRouteMeters: 5,
      alongRouteMeters: 310,
      osm: { type: "way", id: 1, url: "https://www.openstreetmap.org/way/1" },
    },
  ],
  note: "Data OpenStreetMap bisa tidak lengkap atau sudah berubah. Tidak adanya hambatan di daftar ini bukan berarti jalannya bebas hambatan.",
  attribution: "© kontributor OpenStreetMap",
};

function answer(place) {
  return {
    answer: `Ramp di ${place.name} tersedia, menurut data terverifikasi AksesBogor.\n- Guiding block: belum diketahui.\nUntuk rute, lihat langkah dan peringatan di layar.`,
    sources: [
      { type: "lokasi", placeId: place.id, name: place.name, lastVerifiedAt: place.lastVerifiedAt },
      {
        type: "pengetahuan",
        citation: "Permen PUPR No. 14/PRT/M/2017, Lampiran II, B.2 Ram",
        title: "Permen PUPR No. 14/PRT/M/2017",
        url: "https://jdih.pu.go.id/",
        license: "Tanpa hak cipta",
        attribution: null,
      },
      {
        type: "pengetahuan",
        citation: "Rute bus BisKita Koridor 1 (OpenStreetMap)",
        title: "Rute angkutan umum Kota Bogor",
        url: "https://www.openstreetmap.org/relation/1",
        license: "ODbL 1.0",
        attribution: "© kontributor OpenStreetMap",
      },
    ],
    model: "tiruan/model:free",
  };
}

/** Menjawab route agen rute, atau `null` bila bukan route agen rute. */
export function handleAgenRute(method, url, headers, body, places) {
  const { pathname, searchParams } = url;
  if (method === "GET" && pathname === "/_tiruan/agen-terakhir") return [200, { body: lastQuestion.get(searchParams.get("email")) ?? null }];
  if (!pathname.startsWith("/agent/") && !pathname.startsWith("/route/")) return null;
  if (headers["x-visitor-ip"] === AGENT_OFF_IP) return error(503, "agen_rute_belum_aktif", "Agen rute belum dibuka.");
  const user = userFromToken(headers.authorization);
  if (!user) return error(401, "belum_masuk", "Sesi Anda sudah berakhir. Silakan masuk lagi.");
  if (!user.completed) return error(403, "akun_belum_lengkap", "Lengkapi akun dulu sebelum memakai agen rute.");
  const place = places.find((p) => p.id === body?.placeId);

  if (method === "GET" && pathname === "/agent/tools") return [200, { tools: [] }];
  if (method === "POST" && pathname === "/route/walking") {
    const from = body?.from;
    if (typeof from?.lat !== "number" || typeof from?.lng !== "number") return error(400, "input_tidak_valid", "Data yang dikirim tidak sesuai.");
    if (!place) return error(404, "lokasi_tidak_ditemukan", "Lokasi tidak ditemukan.");
    if (!inside(from)) return error(422, "di_luar_kota_bogor", "Posisi Anda berada di luar Kota Bogor. Rute hanya tersedia dari dalam Kota Bogor.");
    return [200, route(from, place)];
  }
  if (method === "POST" && pathname === "/route/obstacles") {
    if (typeof body?.polyline !== "string") return error(400, "input_tidak_valid", "Data yang dikirim tidak sesuai.");
    return [200, OBSTACLES];
  }
  if (method === "POST" && pathname === "/agent/ask") {
    lastQuestion.set(user.email, body);
    if (!place) return error(404, "lokasi_tidak_ditemukan", "Lokasi tidak ditemukan.");
    const question = String(body?.question ?? "");
    if (question.includes("sibuk-tiruan")) return error(503, "agen_sibuk", "Agen sedang sibuk, coba lagi nanti.");
    if (question.includes("batas-tiruan")) return error(429, "agen_terlalu_sering", "Batas 5 pertanyaan per hari untuk akun Anda tercapai. Coba lagi besok.");
    return [200, answer(place)];
  }
  return error(404, "tidak_ditemukan", "Alamat tidak ditemukan.");
}
