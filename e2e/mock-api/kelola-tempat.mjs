// Route kelola tempat tiruan (/admin/places, /admin/candidates) untuk tes Playwright, meniru akses-bogor-api (ADR-0050).
//
// Aturan tiruan:
// - Hanya akun admin (email diawali "admin"); verifikator dan pengguna mendapat 403 bukan_admin.
// - Tempat yang dibuat admin disimpan terpisah dari data contoh, supaya jumlah di tes halaman publik lain tidak berubah:
//   Detail-nya terbuka lewat `createdPlace` (verifiedBy "admin"), tetapi tidak ikut daftar publik. Tempat yang diturunkan
//   ditandai `unpublishedAt` dan Detail-nya 404.
// - Tersedia dan Tidak perlu tanpa foto bertag fasilitas itu disimpan sebagai Belum tahu dan disebut di `downgraded`.
// - Dua kandidat OpenStreetMap; kandidat hilang bila ada tempat berkategori sama dalam 50 m.
import { randomUUID } from "node:crypto";
import { userFromToken } from "./akun.mjs";
import { claimUpload, districtOf, inside, meters, outside } from "./laporkan.mjs";

const error = (status, galat, pesan) => [status, { galat, pesan }];
const EVIDENCE = { ramp: "pintu_masuk", toilet_difabel: "toilet_difabel", guiding_block: "guiding_block", lift: "lift" };
const TAG_LABEL = { pintu_masuk: "pintu masuk dan ramp", toilet_difabel: "toilet difabel", guiding_block: "guiding block", lift: "lift", lainnya: "" };

const created = new Map();
const history = new Map();

const CANDIDATES = [
  { osmType: "way", osmId: 2, name: "Masjid Al-Ikhlas", category: "masjid", district: { slug: "bogor-barat", name: "Bogor Barat" }, location: { lat: -6.5705, lng: 106.7645 }, wheelchair: "limited" },
  { osmType: "node", osmId: 3, name: null, category: "rumah_sakit", district: { slug: "bogor-selatan", name: "Bogor Selatan" }, location: { lat: -6.62, lng: 106.8 }, wheelchair: null },
];

const all = (places) => [...places, ...created.values()];

/** Tempat buatan admin yang masih tayang, untuk Detail publik di server.mjs. */
export function createdPlace(id) {
  const place = created.get(id);
  return place && !place.unpublishedAt ? place : null;
}
const versionOf = (place) => place.updatedAt ?? place.lastVerifiedAt;

const item = (place) => ({
  id: place.id,
  name: place.name,
  category: place.category,
  district: place.district,
  status: place.status,
  summary: place.summary,
  verifiedBy: place.verifiedBy ?? "tim",
  lastVerifiedAt: place.lastVerifiedAt,
  updatedAt: versionOf(place),
  published: !place.unpublishedAt,
  unpublishedAt: place.unpublishedAt ?? null,
  unpublishedReason: place.unpublishedReason ?? null,
});

function record(id, user, action, changes) {
  const entries = history.get(id) ?? [];
  entries.unshift({ id: entries.length + 1, action, actor: { name: user.displayName, label: null }, at: new Date().toISOString(), changes });
  history.set(id, entries);
}

/** Status dan ringkasan sederhana dari jawaban (ADR-0018): pintu masuk dulu, lalu X dari Y. */
function statusOf(facilities) {
  const relevant = facilities.filter((f) => f.answer !== "tidak_perlu");
  const summary = {
    available: relevant.filter((f) => f.answer === "tersedia").length,
    relevant: relevant.length,
    unknown: relevant.filter((f) => f.answer === "belum_tahu").length,
  };
  const ramp = facilities.find((f) => f.facility === "ramp")?.answer;
  const status = ramp === "belum_tahu" ? "belum_diketahui" : ramp === "tidak_tersedia" ? "tidak_aksesibel" : summary.available === summary.relevant ? "aksesibel" : "sebagian";
  return { status, summary };
}

const badReason = (reason) => typeof reason !== "string" || reason.trim().length < 5 || reason.length > 500;

/** Memeriksa isian, lalu mengembalikan tempat baru atau yang diubah beserta fasilitas yang turun menjadi Belum tahu. */
function apply(places, user, body, base, keptPhotos) {
  if (badReason(body?.reason)) return { problem: error(400, "input_tidak_valid", "Alasan wajib diisi, 5 sampai 500 karakter.") };
  if (!Array.isArray(body.facilities) || body.facilities.length !== 4) return { problem: error(400, "input_tidak_valid", "Data yang dikirim tidak sesuai.") };
  if (body.facilities.some((f) => f.answer === "tidak_tersedia" && !f.reason)) {
    return { problem: error(400, "alasan_wajib", "Setiap jawaban Tidak tersedia butuh alasan sebelum diterbitkan.") };
  }
  if (!body.location || !inside(body.location)) return { problem: outside() };
  for (const photo of body.photos ?? []) {
    if (!claimUpload(photo.id, user.email)) return { problem: error(400, "foto_tidak_ditemukan", "Sebagian foto sudah tidak tersimpan di server. Unggah ulang fotonya.") };
  }
  const photos = [
    ...keptPhotos,
    ...(body.photos ?? []).map((p) => ({ id: p.id, url: null, alt: TAG_LABEL[p.tag] ? `Foto ${TAG_LABEL[p.tag]}, ${body.name}` : `Foto ${body.name}`, caption: p.caption ?? null, tag: p.tag })),
  ];
  const tags = new Set(photos.map((p) => p.tag));
  const downgraded = [];
  const facilities = body.facilities.map((f) => {
    if ((f.answer === "tersedia" || f.answer === "tidak_perlu") && !tags.has(EVIDENCE[f.facility])) {
      downgraded.push(f.facility);
      return { facility: f.facility, answer: "belum_tahu", reason: null, note: f.note ?? null };
    }
    return { facility: f.facility, answer: f.answer, reason: f.answer === "tidak_tersedia" ? f.reason : null, note: f.note ?? null };
  });
  const now = new Date().toISOString();
  const place = {
    ...base,
    name: body.name,
    category: body.category,
    district: districtOf(places, body.location),
    location: body.location,
    landmark: body.landmark ?? null,
    description: body.description ?? null,
    facilities,
    photos,
    because: [],
    needsRecheck: false,
    verifiedBy: "admin",
    adminPublishedBy: user.displayName,
    lastVerifiedAt: now,
    updatedAt: now,
    ...statusOf(facilities),
  };
  return { place, downgraded };
}

/** Menjawab route kelola tempat, atau `null` bila bukan route itu. */
export function handleKelolaTempat(method, url, headers, body, places) {
  const { pathname, searchParams } = url;
  if (!pathname.startsWith("/admin/places") && pathname !== "/admin/candidates") return null;
  const user = userFromToken(headers.authorization);
  if (!user) return error(401, "belum_masuk", "Sesi Anda sudah berakhir. Silakan masuk lagi.");
  if (user.role !== "admin") return error(403, "bukan_admin", "Halaman ini hanya untuk admin AksesBogor.");
  const limit = Math.min(Number(searchParams.get("limit") ?? 25), 100);
  const offset = Number(searchParams.get("offset") ?? 0);
  const param = (key) => searchParams.get(key) ?? undefined;

  if (method === "GET" && pathname === "/admin/candidates") {
    const items = CANDIDATES.filter(
      (c) =>
        (!param("q") || (c.name ?? "").toLowerCase().includes(param("q").toLowerCase())) &&
        (!param("category") || c.category === param("category")) &&
        (!param("district") || c.district.slug === param("district")) &&
        !all(places).some((p) => !p.unpublishedAt && p.category === c.category && meters(p.location, c.location) <= 50),
    );
    return [200, { total: items.length, limit, offset, items: items.slice(offset, offset + limit), attribution: "© kontributor OpenStreetMap" }];
  }

  if (method === "GET" && pathname === "/admin/places") {
    const items = all(places)
      .filter(
        (p) =>
          (!param("q") || p.name.toLowerCase().includes(param("q").toLowerCase())) &&
          (!param("category") || p.category === param("category")) &&
          (!param("district") || p.district.slug === param("district")) &&
          (!param("status") || p.status === param("status")) &&
          (!param("origin") || (p.verifiedBy ?? "tim") === param("origin")) &&
          (!param("published") || (param("published") === "ya") === !p.unpublishedAt),
      )
      .sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
    return [200, { total: items.length, limit, offset, items: items.slice(offset, offset + limit).map(item) }];
  }

  if (method === "POST" && pathname === "/admin/places") {
    const { place, downgraded, problem } = apply(places, user, body, { id: randomUUID() }, []);
    if (problem) return problem;
    created.set(place.id, place);
    record(place.id, user, "dibuat_admin", { alasan: body.reason, ...(body.osm ? { osm: body.osm } : {}) });
    return [201, { placeId: place.id, status: place.status, downgraded }];
  }

  const match = pathname.match(/^\/admin\/places\/([^/]+)(\/history|\/restore)?$/);
  if (!match) return null;
  const [, id, suffix] = match;
  const place = all(places).find((p) => p.id === id);
  if (!place) return error(404, "lokasi_tidak_ditemukan", "Lokasi ini tidak ditemukan.");
  const hidden = Boolean(place.unpublishedAt);
  /** Mengganti data tempat di tempat asalnya: data contoh atau tempat buatan admin. */
  const save = (next) => {
    if (created.has(id)) created.set(id, next);
    else places[places.findIndex((p) => p.id === id)] = next;
  };

  if (method === "GET" && suffix === "/history") return [200, { items: history.get(id) ?? [] }];
  if (method === "GET" && !suffix) {
    return [200, { ...item(place), version: versionOf(place), location: place.location, landmark: place.landmark ?? null, description: place.description ?? null, facilities: place.facilities, photos: place.photos, adminPublishedBy: place.verifiedBy === "admin" ? (place.adminPublishedBy ?? null) : null }];
  }

  if (method === "PATCH" && !suffix) {
    if (hidden) return error(409, "lokasi_diturunkan", "Lokasi ini sedang diturunkan. Tayangkan lagi dulu sebelum mengubahnya.");
    if (body?.version !== versionOf(place)) return error(409, "lokasi_berubah", "Data lokasi ini baru saja berubah. Muat ulang halaman dan periksa lagi dengan data terbaru.");
    const removed = body.removePhotos ?? [];
    if (removed.some((photoId) => !place.photos.some((p) => p.id === photoId))) return error(400, "foto_tidak_ditemukan", "Foto yang akan dihapus bukan foto tayang lokasi ini.");
    const { place: changed, downgraded, problem } = apply(places, user, body, place, place.photos.filter((p) => !removed.includes(p.id)));
    if (problem) return problem;
    save(changed);
    record(id, user, "diubah_admin", { alasan: body.reason, ...(place.name !== changed.name ? { name: { sebelum: place.name, sesudah: changed.name } } : {}) });
    return [200, { placeId: id, status: changed.status, downgraded }];
  }

  if (method === "DELETE" && !suffix) {
    if (badReason(body?.reason)) return error(400, "input_tidak_valid", "Alasan wajib diisi, 5 sampai 500 karakter.");
    if (hidden) return error(409, "sudah_diturunkan", "Lokasi ini sudah diturunkan.");
    save({ ...place, unpublishedAt: new Date().toISOString(), unpublishedReason: body.reason, updatedAt: new Date().toISOString() });
    record(id, user, "diturunkan", { tayang: { sebelum: true, sesudah: false }, alasan: body.reason });
    return [204, null];
  }

  if (method === "POST" && suffix === "/restore") {
    if (badReason(body?.reason)) return error(400, "input_tidak_valid", "Alasan wajib diisi, 5 sampai 500 karakter.");
    if (!hidden) return error(409, "masih_tayang", "Lokasi ini masih tayang.");
    const unpublishedReason = place.unpublishedReason;
    save({ ...place, unpublishedAt: null, unpublishedReason: null, updatedAt: new Date().toISOString() });
    record(id, user, "ditayangkan_lagi", { tayang: { sebelum: false, sesudah: true }, alasanTurun: unpublishedReason, alasan: body.reason });
    return [204, null];
  }
  return null;
}
