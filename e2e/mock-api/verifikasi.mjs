// Route panel verifikator tiruan (/verifier, /admin) untuk tes Playwright, meniru akses-bogor-api (ADR-0035 sampai
// ADR-0037). Data hanya di memori.
//
// Aturan tiruan:
// - Email yang diawali "verifikator" berperan verifikator, "admin" berperan admin (akun.mjs).
// - Setiap akun verifikator punya salinan antreannya sendiri, supaya tes yang berjalan bersamaan tidak saling mengubah.
//   Isinya: laporan tempat baru (2 foto), laporan kekurangan Halte contoh yang membuat lift tidak tersedia, laporan
//   perubahan yang menunggu klarifikasi, dan satu laporan milik verifikator itu sendiri yang tidak pernah tampil.
// - Menerbitkan tidak mengubah fixtures.json, jadi halaman lokasi lain tetap sama.
import { randomUUID } from "node:crypto";
import { findUser, userFromToken } from "./akun.mjs";

const PHOTO = Buffer.from("UklGRsoBAABXRUJQVlA4IL4BAACQDwCdASqgAHgAPu1mqU26NT+iLZS+m/AdiU3b/5nYATk2qb7ZmnxUl5mgIJMPCYCcyZgA0utM7u00+ec9539NH41Tlkvca/POe8Yu1r1N/n7vNL+66T+F5pn3nf0uf5mJhHXK2ztMxZe4NrmLGwHYXfLJe41+ec8Fv/////////7P/90MAMzK+FQv8raruYOVy5Zgv2v/29QGCp1Nr/oTPVHWs3vl/DL2WrR0rq4KHf98qyVYzD/yEArnoDLamUV6T+r7+b6Gb7LPTOUWR3GQu0Gu+3uSV4na/gGcLblTYZR0C/UAcYQMLH0Q2fI79+ESIe4BFjihvFw9FDy0M8ifeRR0TW/osN6aDj9r933ZDalS0dufINw7hdFYiiwLPPy2fxxi+5QY8Hn1fmnqz9LbtVtD6mXbOf7F7SB/SgZTzC+Xd7u/z5BTbhbNgdnWPeuZhkUOd6rFa74VA9OIBb7DrZhrA+INFtXR7N6TxvfK1Y41jmgQZWQ50ahbug5QzmQPA8WwCvCz9dLgl5d6ANIfJrbkA+ua7EY6d3Yn1LnAuMGVOmEFje1joZIn6Rzm415otREjr72nYE1gH1gAAA==", "base64");
const FACILITIES = ["ramp", "toilet_difabel", "guiding_block", "lift"];
const error = (status, galat, pesan) => [status, { galat, pesan }];
const facilities = (answers) =>
  FACILITIES.map((facility) => ({ facility, answer: "belum_tahu", reason: null, note: null, ...answers[facility] }));

/** Aturan pintu masuk dulu (ADR-0018), sama dengan API. */
function computeStatus(items) {
  const relevant = items.filter((f) => f.answer !== "tidak_perlu");
  const unknown = relevant.filter((f) => f.answer === "belum_tahu").length;
  const available = relevant.filter((f) => f.answer === "tersedia").length;
  const ramp = items.find((f) => f.facility === "ramp")?.answer ?? "belum_tahu";
  const counts = { available, relevant: relevant.length, unknown };
  if (ramp === "tidak_tersedia") return { status: "tidak_aksesibel", ...counts };
  if (ramp === "belum_tahu" || (relevant.length > 0 && unknown * 2 >= relevant.length)) return { status: "belum_diketahui", ...counts };
  if (available === relevant.length) return { status: "aksesibel", ...counts };
  return { status: "sebagian", ...counts };
}

const photo = (id, reportId, tag, caption = null) => ({ id, reportId, tag, caption, alt: "", width: 160, height: 120, hidden: false, blur: [], clarificationId: null });

function seed(places) {
  const halte = places.find((p) => p.name === "Halte contoh");
  const kampus = places.find((p) => p.name === "Kampus contoh B");
  const reports = [
    {
      id: "10000000-0000-4000-8000-000000000001",
      kind: "baru",
      status: "menunggu",
      placeId: null,
      reporterName: "Sari",
      submittedAt: "2026-11-01T02:00:00.000Z",
      submission: {
        name: "Masjid Jami contoh",
        category: "masjid",
        location: { lat: -6.5976, lng: 106.7991 },
        district: { slug: "bogor-tengah", name: "Bogor Tengah" },
        landmark: "Dekat pasar",
        description: "Ramp di pintu utama, toilet di sebelah kanan.",
        facilities: facilities({ ramp: { answer: "tersedia" }, toilet_difabel: { answer: "tersedia", note: "Kunci di pos satpam" }, lift: { answer: "tidak_perlu" } }),
      },
      clarifications: [],
    },
    {
      id: "10000000-0000-4000-8000-000000000002",
      kind: "kekurangan",
      status: "menunggu",
      placeId: halte.id,
      reporterName: "Budi",
      submittedAt: "2026-11-03T02:00:00.000Z",
      submission: {
        name: halte.name,
        category: halte.category,
        location: halte.location,
        district: halte.district,
        landmark: halte.landmark,
        description: halte.description,
        facilities: halte.facilities.map((f) => (f.facility === "lift" ? { ...f, answer: "tidak_tersedia", reason: "rusak", note: "Rusak sejak awal November" } : f)),
      },
      clarifications: [],
    },
    {
      id: "10000000-0000-4000-8000-000000000003",
      kind: "perubahan",
      status: "klarifikasi",
      placeId: kampus.id,
      reporterName: "Rina",
      submittedAt: "2026-11-05T02:00:00.000Z",
      clarificationDueAt: "2026-11-12T02:00:00.000Z",
      submission: { name: kampus.name, category: kampus.category, location: kampus.location, district: kampus.district, landmark: kampus.landmark, description: kampus.description, facilities: kampus.facilities },
      clarifications: [{ id: randomUUID(), question: "Apakah lift sudah diperbaiki?", askedAt: "2026-11-05T05:00:00.000Z", dueAt: "2026-11-12T02:00:00.000Z", answer: null, answeredAt: null }],
    },
    { id: "10000000-0000-4000-8000-000000000004", kind: "baru", status: "menunggu", own: true, placeId: null, reporterName: "Verifikator", submittedAt: "2026-10-30T02:00:00.000Z", submission: { name: "Laporan saya sendiri", category: "halte", location: { lat: -6.6, lng: 106.8 }, district: { slug: "bogor-tengah", name: "Bogor Tengah" }, landmark: null, description: null, facilities: facilities({}) }, clarifications: [] },
  ];
  const photos = new Map(
    [
      photo("20000000-0000-4000-8000-000000000001", reports[0].id, "pintu_masuk", "Ramp dari parkir"),
      photo("20000000-0000-4000-8000-000000000002", reports[0].id, "lainnya"),
      photo("20000000-0000-4000-8000-000000000003", reports[1].id, "lift"),
    ].map((p) => [p.id, p]),
  );
  return { reports, photos };
}

/** Foto seperti di respons API, tanpa id laporannya. */
const shown = ({ id, tag, caption, alt, width, height, hidden, blur, clarificationId }) => ({ id, tag, caption, alt, width, height, hidden, blur, clarificationId });

const worlds = new Map();
const worldOf = (user, places) => worlds.get(user.email) ?? worlds.set(user.email, seed(places)).get(user.email);

const queueItem = (report, photos) => ({
  id: report.id,
  kind: report.kind,
  status: report.status,
  placeId: report.placeId,
  name: report.submission.name,
  category: report.submission.category,
  district: report.submission.district,
  reporterName: report.reporterName,
  photos: [...photos.values()].filter((p) => p.reportId === report.id).length,
  submittedAt: report.submittedAt,
  answered: report.clarifications.some((c) => c.answer),
  clarificationDueAt: report.clarificationDueAt ?? null,
  worsens: report.id.endsWith("2"),
});

function review(report, photos, places) {
  const place = report.placeId ? places.find((p) => p.id === report.placeId) : null;
  return {
    id: report.id,
    kind: report.kind,
    status: report.status,
    submittedAt: report.submittedAt,
    decidedAt: report.decidedAt ?? null,
    rejectionReason: report.rejectionReason ?? null,
    reporterName: report.reporterName,
    reviewerNote: report.reviewerNote ?? null,
    submission: { ...report.submission, status: computeStatus(report.submission.facilities) },
    photos: [...photos.values()].filter((p) => p.reportId === report.id).map(shown),
    clarifications: report.clarifications,
    place: place
      ? {
          id: place.id,
          version: place.lastVerifiedAt,
          name: place.name,
          category: place.category,
          location: place.location,
          district: place.district,
          landmark: place.landmark,
          description: place.description,
          facilities: place.facilities,
          status: { status: place.status, ...place.summary },
          lastVerifiedAt: place.lastVerifiedAt,
          photos: place.photos,
        }
      : null,
    nearby: report.kind === "baru" ? [{ id: places[0].id, name: places[0].name, category: places[0].category, status: places[0].status, distanceMeters: 38 }] : [],
  };
}

const decided = () => error(409, "sudah_diputuskan", "Laporan ini sudah diputuskan. Muat ulang halaman untuk melihat hasilnya.");

/** Menjawab route verifikator dan admin, atau `null` bila bukan route itu. */
export function handleVerifikasi(method, url, headers, body, places) {
  const { pathname } = url;
  if (!pathname.startsWith("/verifier") && !pathname.startsWith("/admin")) return null;
  const user = userFromToken(headers.authorization);
  if (!user) return error(401, "belum_masuk", "Sesi Anda sudah berakhir. Silakan masuk lagi.");
  if (user.role !== "verifikator" && user.role !== "admin") return error(403, "bukan_verifikator", "Halaman ini hanya untuk verifikator AksesBogor.");
  const { reports, photos } = worldOf(user, places);

  if (pathname.startsWith("/admin")) return handleTeam(method, pathname, body, user);

  if (method === "GET" && pathname === "/verifier/reports") {
    const status = url.searchParams.get("status") ?? "menunggu";
    const items = reports.filter((r) => !r.own && r.status === status).sort((a, b) => a.submittedAt.localeCompare(b.submittedAt));
    return [200, { total: items.length, items: items.map((r) => queueItem(r, photos)) }];
  }
  if (method === "GET" && pathname === "/verifier/places/recheck") {
    const before = new Date();
    before.setUTCMonth(before.getUTCMonth() - 12);
    const items = places.filter((p) => new Date(p.lastVerifiedAt) < before).sort((a, b) => a.lastVerifiedAt.localeCompare(b.lastVerifiedAt));
    return [200, { total: items.length, items: items.map(({ id, name, category, district, status, lastVerifiedAt }) => ({ id, name, category, district, status, lastVerifiedAt })) }];
  }
  const photoId = pathname.match(/^\/verifier\/photos\/([^/]+)$/)?.[1];
  if (method === "GET" && photoId) {
    return photos.has(photoId) ? [200, PHOTO, { "content-type": "image/webp", "cache-control": "private, no-store" }] : error(404, "foto_tidak_ditemukan", "Foto ini tidak ditemukan atau sudah terbit.");
  }

  const match = pathname.match(/^\/verifier\/reports\/([^/]+)(?:\/(publish|clarify|reject|photos\/([^/]+)))?$/);
  if (!match) return null;
  const [, id, action, moderated] = match;
  const report = reports.find((r) => r.id === id);
  if (!report) return error(404, "laporan_tidak_ditemukan", "Laporan ini tidak ditemukan. Mungkin pelapornya sudah menghapus akun.");
  if (report.own) return error(403, "laporan_sendiri", "Anda tidak bisa memeriksa laporan Anda sendiri. Biarkan verifikator lain yang memeriksanya.");
  if (method === "GET" && !action) return [200, review(report, photos, places)];
  const open = report.status === "menunggu" || report.status === "klarifikasi";

  if (method === "PATCH" && moderated) {
    const item = photos.get(moderated);
    if (!item || item.reportId !== id) return error(404, "foto_tidak_ditemukan", "Foto ini tidak ditemukan atau sudah terbit.");
    if (!open) return decided();
    for (const key of ["hidden", "tag", "caption", "blur"]) if (body?.[key] !== undefined) item[key] = body[key];
    return [200, shown(item)];
  }
  if (method !== "POST") return null;
  if (!open) return decided();
  if (action === "reject") {
    Object.assign(report, { status: "ditolak", rejectionReason: body.reason, reviewerNote: body.note ?? null, decidedAt: new Date().toISOString() });
    return [200, { status: "ditolak", rejectionReason: body.reason }];
  }
  if (action === "clarify") {
    if (report.status !== "menunggu") return error(409, "klarifikasi_terbuka", "Laporan ini masih menunggu jawaban pelapor atas pertanyaan sebelumnya.");
    const dueAt = new Date(Date.now() + 7 * 24 * 3600_000).toISOString();
    report.clarifications.push({ id: randomUUID(), question: body.question, askedAt: new Date().toISOString(), dueAt, answer: null, answeredAt: null });
    Object.assign(report, { status: "klarifikasi", clarificationDueAt: dueAt });
    return [200, { status: "klarifikasi", clarificationDueAt: dueAt }];
  }
  // Terbitkan: periksa alasan dan versi lokasi seperti API.
  if (body.facilities.some((f) => f.evidence === "terbukti" && f.answer === "tidak_tersedia" && !f.reason)) {
    return error(400, "alasan_wajib", "Setiap jawaban Tidak tersedia butuh alasan sebelum diterbitkan.");
  }
  if (report.placeId && body.placeVersion !== places.find((p) => p.id === report.placeId)?.lastVerifiedAt) {
    return error(409, "lokasi_berubah", "Data lokasi ini baru saja berubah. Muat ulang halaman dan periksa lagi dengan data terbaru.");
  }
  const placeId = report.placeId ?? randomUUID();
  Object.assign(report, { status: "diterbitkan", placeId, reviewerNote: body.note ?? null, decidedAt: new Date().toISOString(), published: body });
  return [200, { status: "diterbitkan", placeId }];
}

function handleTeam(method, pathname, body, user) {
  if (user.role !== "admin") return error(403, "bukan_admin", "Halaman ini hanya untuk admin AksesBogor.");
  const member = ({ id, displayName, email, role }) => ({ id, displayName, email, role });
  if (method === "GET" && pathname === "/admin/team") {
    return [200, { items: findUser().filter((u) => u.role !== "pengguna").map(member) }];
  }
  if (method === "POST" && pathname === "/admin/team") {
    const target = findUser(String(body?.email ?? "").trim().toLowerCase());
    if (!target) return error(404, "akun_tidak_ditemukan", "Tidak ada akun dengan email itu. Minta orangnya masuk ke AksesBogor dulu.");
    if (!target.completed) return error(409, "akun_belum_lengkap", "Akun ini belum dilengkapi. Minta pemiliknya mengisi nama tampilan dan menyetujui Kebijakan Privasi dulu.");
    if (target.role === "pengguna") target.role = "verifikator";
    return [200, member(target)];
  }
  const id = pathname.match(/^\/admin\/team\/([^/]+)$/)?.[1];
  if (method === "DELETE" && id) {
    const target = findUser().find((u) => u.id === id);
    if (!target || target.role === "pengguna") return error(404, "bukan_anggota_tim", "Akun ini bukan anggota tim verifikasi.");
    if (target.role === "admin") return error(409, "admin_lewat_skrip", "Peran admin hanya bisa diubah lewat skrip di server.");
    target.role = "pengguna";
    return [204, null];
  }
  return null;
}
