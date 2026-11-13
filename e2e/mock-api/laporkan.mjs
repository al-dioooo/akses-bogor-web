// Route Laporkan tiruan (/reports, /map/search) untuk tes Playwright, meniru akses-bogor-api. Data hanya di memori.
//
// Aturan tiruan:
// - Kotak Kota Bogor kira-kira 106.7348–106.8486 bujur dan -6.6813 – -6.5143 lintang; di luar itu 422. Kecamatan diambil
//   dari lokasi contoh terdekat.
// - Pencarian "galat-tiruan" menjawab 502. Hasil Mapbox tiruan: Masjid Raya Bogor, Stasiun Bogor, dan Kampus IPB
//   Dramaga (di luar Kota Bogor).
// - POST /_tiruan/foto-gagal { "email": "...", "kali": n } membuat n unggahan foto berikutnya dari akun itu gagal 502.
//   Penghitungnya per akun karena tes Playwright berjalan paralel: unggahan dari tes lain tidak boleh memakai galatnya.
import { randomUUID } from "node:crypto";
import { userFromToken } from "./akun.mjs";

const BOX = { west: 106.7348, east: 106.8486, south: -6.6813, north: -6.5143 };
const MAPBOX = [
  { name: "Masjid Raya Bogor", address: "Jl. Raya Pajajaran, Bogor Timur, Kota Bogor", location: { lat: -6.5871, lng: 106.8104 }, kind: "poi" },
  { name: "Stasiun Bogor", address: "Jl. Nyi Raja Permas, Bogor Tengah, Kota Bogor", location: { lat: -6.5953, lng: 106.7905 }, kind: "poi" },
  { name: "Kampus IPB Dramaga", address: "Dramaga, Kabupaten Bogor", location: { lat: -6.5579, lng: 106.7268 }, kind: "poi" },
];
const uploads = new Map();
const failingUploads = new Map();

const error = (status, galat, pesan) => [status, { galat, pesan }];
const inside = ({ lat, lng }) => lng >= BOX.west && lng <= BOX.east && lat >= BOX.south && lat <= BOX.north;
const meters = (a, b) => {
  const rad = (d) => (d * Math.PI) / 180;
  const x = rad(b.lng - a.lng) * Math.cos(rad((a.lat + b.lat) / 2));
  return Math.round(Math.hypot(x, rad(b.lat - a.lat)) * 6_371_000);
};
const similar = (a, b) => a.toLowerCase().includes(b.toLowerCase()) || b.toLowerCase().includes(a.toLowerCase());
const outside = () =>
  error(422, "di_luar_kota_bogor", "Titik ini berada di luar Kota Bogor. Untuk saat ini AksesBogor hanya mencatat tempat di enam kecamatan Kota Bogor: Bogor Barat, Bogor Selatan, Bogor Tengah, Bogor Timur, Bogor Utara, dan Tanah Sareal.");

function districtOf(places, point) {
  const nearest = [...places].sort((a, b) => meters(a.location, point) - meters(b.location, point))[0];
  return nearest.district;
}

/** Menjawab route Laporkan, atau `null` bila bukan route Laporkan. */
export function handleLaporkan(method, pathname, headers, body, places) {
  if (method === "POST" && pathname === "/_tiruan/foto-gagal") {
    if (typeof body?.email !== "string") return error(400, "input_tidak_valid", "Sertakan email akun yang unggahannya dibuat gagal.");
    failingUploads.set(body.email, Number(body.kali ?? 1));
    return [200, { ok: true }];
  }

  if (method === "POST" && pathname === "/reports/location-check") {
    const point = body?.location;
    if (typeof point?.lat !== "number" || typeof point?.lng !== "number") return error(400, "input_tidak_valid", "Data yang dikirim tidak sesuai. Periksa lagi isiannya.");
    if (!inside(point)) return outside();
    const nearby = places
      .filter((p) => p.id !== body.placeId && meters(p.location, point) <= 50 && (!body.name || similar(p.name, body.name)))
      .map((p) => ({ id: p.id, name: p.name, category: p.category, status: p.status, distanceMeters: meters(p.location, point) }));
    return [200, { district: districtOf(places, point), nearby }];
  }

  if (method === "POST" && pathname === "/map/search") {
    const q = String(body?.q ?? "").trim().toLowerCase();
    if (q.length < 2) return error(400, "input_tidak_valid", "Data yang dikirim tidak sesuai. Periksa lagi isiannya.");
    if (q === "galat-tiruan") return error(502, "pencarian_gagal", "Pencarian tempat sedang gangguan. Coba lagi, atau geser peta.");
    const words = q.split(/\s+/);
    const matches = (name) => words.every((word) => name.toLowerCase().includes(word));
    return [
      200,
      {
        places: places.filter((p) => matches(p.name)).slice(0, 3).map(({ id, name, category, status, district, location }) => ({ id, name, category, status, district, location })),
        results: MAPBOX.filter((r) => words.some((word) => r.name.toLowerCase().includes(word))),
      },
    ];
  }

  if (!pathname.startsWith("/reports")) return null;
  const user = userFromToken(headers.authorization);
  if (!user) return error(401, "belum_masuk", "Sesi Anda sudah berakhir. Silakan masuk lagi.");
  if (!user.completed) return error(403, "akun_belum_lengkap", "Lengkapi akun dulu sebelum mengirim laporan.");

  if (method === "POST" && pathname === "/reports/photos") {
    const failing = failingUploads.get(user.email) ?? 0;
    if (failing > 0) {
      failingUploads.set(user.email, failing - 1);
      return error(502, "foto_gagal_disimpan", "Foto gagal disimpan. Coba unggah lagi.");
    }
    if (!body?.length) return error(400, "foto_tidak_valid", "Berkas ini tidak bisa dibaca sebagai foto. Pilih foto JPEG, PNG, atau WebP lain.");
    const id = randomUUID();
    uploads.set(id, user.email);
    return [201, { id, width: 1600, height: 1200, bytes: body.length }];
  }

  if (method === "POST" && pathname === "/reports") {
    user.reports ??= [];
    const repeat = user.reports.find((r) => r.submissionKey === body?.submissionKey);
    if (repeat) return [201, repeat.response];
    if (!Array.isArray(body?.facilities) || body.facilities.length !== 4) return error(400, "input_tidak_valid", "Data yang dikirim tidak sesuai. Periksa lagi isiannya.");
    const place = body.placeId ? places.find((p) => p.id === body.placeId) : null;
    if (body.placeId && !place) return error(404, "lokasi_tidak_ditemukan", "Lokasi ini tidak ditemukan.");
    const location = body.kind === "kekurangan" ? place.location : body.location;
    if (!location || !inside(location)) return outside();
    for (const photo of body.photos ?? []) {
      if (uploads.get(photo.id) !== user.email) return error(400, "foto_tidak_ditemukan", "Sebagian foto sudah tidak tersimpan di server. Unggah ulang fotonya, lalu kirim lagi.");
    }
    for (const photo of body.photos ?? []) uploads.delete(photo.id);
    const name = body.kind === "kekurangan" ? place.name : body.name;
    const response = {
      id: randomUUID(),
      kind: body.kind,
      status: "menunggu",
      placeId: body.placeId ?? null,
      name,
      district: districtOf(places, location),
      photos: body.photos?.length ?? 0,
      submittedAt: new Date().toISOString(),
    };
    user.reports.unshift({ submissionKey: body.submissionKey, response, payload: body });
    return [201, response];
  }
  return null;
}
