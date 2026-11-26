// Route agen bantu memetakan tiruan (/agent/tools, /route/walking, /route/obstacles, /agent/ask) untuk tes Playwright,
// meniru akses-bogor-api (ADR-0042, ADR-0043). Data hanya di memori.
//
// Aturan tiruan:
// - Agen dibuka, kecuali untuk IP pengunjung 203.0.113.250: semua route agen menjawab 503 agen_rute_belum_aktif,
//   supaya tes "tersembunyi" tidak mengganggu tes lain yang berjalan bersamaan.
// - Jawaban biasa membawa empat kartu: prioritas kecamatan, fasilitas OSM tanpa data (Masjid Al-Hidayah, node 9001),
//   lokasi AksesBogor (Halte contoh), dan rute ke fasilitas OSM itu. Pertanyaan yang memuat "tanpa-kartu" dijawab tanpa
//   kartu, "sibuk-tiruan" menjawab 503 agen_sibuk, dan "batas-tiruan" menjawab 429.
// - Rute ke lokasi AksesBogor (placeId) atau fasilitas OSM tiruan (osm). Titik awal di luar kotak Kota Bogor menjawab
//   422 di_luar_kota_bogor. Rute tiruan berupa garis lurus tiga langkah dengan dua hambatan OpenStreetMap.
// - GET /_tiruan/agen-terakhir?email=... menjawab badan /agent/ask terakhir dari akun itu, untuk memastikan posisi
//   pengguna tidak pernah ikut terkirim.
// - Selama asisten rute publik dibuka (ADR-0050), /route/walking ke lokasi AksesBogor dan /route/obstacles juga
//   menjawab permintaan tanpa sesi, termasuk rute ke kandidat OpenStreetMap (ADR-0049).
import { userFromToken } from "./akun.mjs";
import { ASSISTANT_OFF_IP } from "./tanya-rute.mjs";

export const AGENT_OFF_IP = "203.0.113.250";
const BOX = { west: 106.7348, east: 106.8486, south: -6.6813, north: -6.5143 };
const lastQuestion = new Map();
const HALTE = "4037ba19-b366-45bc-aceb-270944fe9372";
/** Fasilitas OpenStreetMap tiruan yang belum punya data AksesBogor. */
const OSM_PLACES = [{ type: "node", id: 9001, name: "Masjid Al-Hidayah", category: "masjid", district: { slug: "bogor-barat", name: "Bogor Barat" }, location: { lat: -6.5712, lng: 106.7655 } }];

/** Prioritas kecamatan tiruan, sama bentuknya dengan GET /districts/priority. */
export const PRIORITY = {
  year: 2025,
  districts: [
    { slug: "bogor-barat", name: "Bogor Barat", registered: 1240, verifiedPlaces: 1, facilitiesWithoutData: 38, score: 92, rank: 1, level: "sangat_tinggi" },
    { slug: "tanah-sareal", name: "Tanah Sareal", registered: 1105, verifiedPlaces: 2, facilitiesWithoutData: 31, score: 78, rank: 2, level: "tinggi" },
    { slug: "bogor-selatan", name: "Bogor Selatan", registered: 980, verifiedPlaces: 1, facilitiesWithoutData: 27, score: 64, rank: 3, level: "tinggi" },
    { slug: "bogor-timur", name: "Bogor Timur", registered: 610, verifiedPlaces: 1, facilitiesWithoutData: 19, score: 41, rank: 4, level: "sedang" },
    { slug: "bogor-utara", name: "Bogor Utara", registered: 720, verifiedPlaces: 1, facilitiesWithoutData: 12, score: 33, rank: 5, level: "sedang" },
    { slug: "bogor-tengah", name: "Bogor Tengah", registered: 450, verifiedPlaces: 1, facilitiesWithoutData: 9, score: 18, rank: 6, level: "rendah" },
  ],
  yearTotals: [
    { year: 2024, registered: 3150 },
    { year: 2025, registered: 5105 },
  ],
  formula: "Skor naik bila penyandang disabilitas terdaftar banyak dan fasilitas tanpa data banyak, dan turun bila lokasi terverifikasi banyak.",
  facilitiesSource: { retrievedAt: "2026-11-16T00:00:00.000Z", attribution: "© kontributor OpenStreetMap" },
  caveat: "Angka ini jumlah penyandang disabilitas yang terdaftar di Dinas Sosial, bukan jumlah seluruh penduduk; lonjakan antartahun besar.",
  source: { title: "Jumlah Penyandang Disabilitas Menurut Kecamatan", url: "https://opendata.kotabogor.go.id/", publisher: "Open Data Kota Bogor, Dinas Sosial", retrievedAt: "2026-11-22T00:00:00.000Z", terms: "Data terbuka Pemerintah Kota Bogor" },
};

const error = (status, galat, pesan) => [status, { galat, pesan }];
const inside = ({ lat, lng }) => lng >= BOX.west && lng <= BOX.east && lat >= BOX.south && lat <= BOX.north;
const WARNING =
  "Rute ini rute jalan kaki dari Mapbox. Rute ini tidak memperhitungkan tangga, trotoar, kerb, atau kemiringan jalan, jadi belum tentu bisa dilewati kursi roda.";

function route(from, destination) {
  const to = destination.location;
  const mid = { lat: (from.lat + to.lat) / 2, lng: from.lng };
  const leg = (a, b) => Math.round(Math.hypot((b.lng - a.lng) * 110_000, (b.lat - a.lat) * 110_000));
  const first = leg(from, mid);
  const second = leg(mid, to);
  return {
    destination,
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

/** Jawaban agen kontributor tiruan dengan empat kartu; dipakai juga Agen AI untuk akun dengan alat kontributor. */
export function contributorAnswer(places, question) {
  const halte = places.find((p) => p.id === HALTE);
  const osm = OSM_PLACES[0];
  const osmTarget = { kind: "osm", osmType: osm.type, osmId: osm.id };
  const cards = question.includes("tanpa-kartu")
    ? []
    : [
        { type: "prioritas", ...PRIORITY },
        { type: "tempat", target: osmTarget, name: osm.name, category: osm.category, district: osm.district, location: osm.location, osmUrl: `https://www.openstreetmap.org/${osm.type}/${osm.id}`, attribution: "© kontributor OpenStreetMap" },
        { type: "tempat", target: { kind: "aksesbogor", placeId: halte.id }, name: halte.name, category: halte.category, district: halte.district, status: halte.status, lastVerifiedAt: halte.lastVerifiedAt },
        { type: "rute", target: osmTarget, name: osm.name },
      ];
  return {
    answer: `Bogor Barat paling diprioritaskan.\n- ${osm.name} belum punya data AksesBogor.\nData aksesibilitas untuk tempat itu belum tersedia, jadi rute ke sana belum bisa disebut aksesibel.`,
    sources: [
      { type: "lokasi", placeId: halte.id, name: halte.name, lastVerifiedAt: halte.lastVerifiedAt },
      { type: "pengetahuan", citation: "Masjid Al-Hidayah (OpenStreetMap)", title: "Fasilitas OpenStreetMap Kota Bogor", url: `https://www.openstreetmap.org/${osm.type}/${osm.id}`, license: "ODbL 1.0", attribution: "© kontributor OpenStreetMap" },
    ],
    model: "tiruan/model:free",
    cards,
  };
}

/** Menjawab route agen bantu memetakan, atau `null` bila bukan route agen. */
export function handleAgenRute(method, url, headers, body, places) {
  const { pathname, searchParams } = url;
  if (method === "GET" && pathname === "/_tiruan/agen-terakhir") return [200, { body: lastQuestion.get(searchParams.get("email")) ?? null }];
  if (!pathname.startsWith("/agent/") && !pathname.startsWith("/route/")) return null;
  const visitorRoute =
    !headers.authorization && headers["x-visitor-ip"] !== ASSISTANT_OFF_IP && (pathname === "/route/obstacles" || pathname === "/route/walking");
  const user = userFromToken(headers.authorization);
  if (!visitorRoute) {
    if (headers["x-visitor-ip"] === AGENT_OFF_IP) return error(503, "agen_rute_belum_aktif", "Agen rute belum dibuka.");
    if (!user) return error(401, "belum_masuk", "Sesi Anda sudah berakhir. Silakan masuk lagi.");
    if (!user.completed) return error(403, "akun_belum_lengkap", "Lengkapi akun dulu sebelum memakai agen rute.");
  }
  const place = places.find((p) => p.id === body?.placeId);

  if (method === "GET" && pathname === "/agent/tools") return [200, { tools: [] }];
  if (method === "POST" && pathname === "/route/walking") {
    const from = body?.from;
    if (typeof from?.lat !== "number" || typeof from?.lng !== "number") return error(400, "input_tidak_valid", "Data yang dikirim tidak sesuai.");
    if ((body?.placeId === undefined) === (body?.osm === undefined)) return error(400, "input_tidak_valid", "Kirim placeId atau osm, salah satu saja.");
    const osm = body?.osm ? OSM_PLACES.find((p) => p.type === body.osm.type && p.id === body.osm.id) : undefined;
    const destination = place
      ? { placeId: place.id, osm: null, name: place.name, location: place.location }
      : osm
        ? { placeId: null, osm: { type: osm.type, id: osm.id }, name: osm.name, location: osm.location }
        : null;
    if (!destination) return error(404, "lokasi_tidak_ditemukan", "Lokasi tidak ditemukan.");
    if (!inside(from)) return error(422, "di_luar_kota_bogor", "Posisi Anda berada di luar Kota Bogor. Rute hanya tersedia dari dalam Kota Bogor.");
    return [200, route(from, destination)];
  }
  if (method === "POST" && pathname === "/route/obstacles") {
    if (typeof body?.polyline !== "string") return error(400, "input_tidak_valid", "Data yang dikirim tidak sesuai.");
    return [200, OBSTACLES];
  }
  if (method === "POST" && pathname === "/agent/ask") {
    lastQuestion.set(user.email, body);
    if (body?.placeId !== undefined && !place) return error(404, "lokasi_tidak_ditemukan", "Lokasi tidak ditemukan.");
    const question = String(body?.question ?? "");
    if (question.includes("sibuk-tiruan")) return error(503, "agen_sibuk", "Agen sedang sibuk, coba lagi nanti.");
    if (question.includes("batas-tiruan")) return error(429, "agen_terlalu_sering", "Batas 5 pertanyaan per hari untuk akun Anda tercapai. Coba lagi besok.");
    return [200, contributorAnswer(places, question)];
  }
  return error(404, "tidak_ditemukan", "Alamat tidak ditemukan.");
}
