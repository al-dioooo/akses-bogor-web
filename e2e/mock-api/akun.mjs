// Route akun tiruan (/auth, /me) untuk tes Playwright, meniru akses-bogor-api (ADR-0029). Data hanya di memori.
//
// Aturan tiruan:
// - Kode yang benar selalu 123456. Kode 000000 menjawab kode_salah, 999999 menjawab kode_kedaluwarsa.
// - Kode kedua untuk email yang sama dalam 60 detik menjawab 429. Email gagal@... menjawab 502.
// - Email lama-... dan pelapor-... sudah punya akun lengkap bernama "Sari". Email lain membuat akun baru yang belum lengkap.
// - ID token Google "tiruan-google" masuk sebagai google@contoh.id; "tiruan-google-belum" menjawab 403.
// - Token "akun:<email>" (akun lengkap) dan "baru:<email>" (belum lengkap) bisa langsung dipakai sebagai cookie.
// - Email yang diawali "verifikator" atau "admin" mendapat peran itu.
// - Akun pelapor... punya empat laporan contoh; akun lain belum punya laporan. Pertanyaan klarifikasinya bisa dijawab
//   lewat POST /me/reports/{id}/clarification, lalu laporan itu kembali menunggu verifikasi.
// - GET /_tiruan/akun?email=... menjawab apakah akunnya masih ada (untuk tes hapus akun).
// - POST /_tiruan/cabut-sesi { email } mencabut semua sesi akun itu, seperti sesi yang berakhir.
import { randomUUID } from "node:crypto";

export const PRIVACY_POLICY_VERSION = "2026-11-10";
const users = new Map();
const tokens = new Map();
const lastCodeAt = new Map();

const error = (status, galat, pesan, headers) => [status, { galat, pesan }, headers];

/** Peran dari awalan email, untuk tes panel verifikator (verifikasi.mjs). */
const roleOf = (email) => (email.startsWith("admin") ? "admin" : email.startsWith("verifikator") ? "verifikator" : "pengguna");

function createUser(email, { completed = false, displayName = "" } = {}) {
  const user = { id: randomUUID(), email, displayName, role: roleOf(email), completed, createdAt: new Date().toISOString() };
  users.set(email, user);
  return user;
}

const publicUser = ({ id, displayName, email, role, completed, createdAt }) => ({ id, displayName, email, role, needsCompletion: !completed, createdAt });

function signIn(email, defaults) {
  const existing = ["lama-", "pelapor-", "verifikator", "admin"].some((prefix) => email.startsWith(prefix));
  const user = users.get(email) ?? createUser(email, existing ? { completed: true, displayName: "Sari" } : defaults);
  const token = `tiruan-${randomUUID()}`;
  tokens.set(token, email);
  return [200, { token, expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60_000).toISOString(), user: publicUser(user) }];
}

/** Akun dengan email itu, atau semua akun tanpa email. */
export function findUser(email) {
  return email === undefined ? [...users.values()] : (users.get(email) ?? null);
}

export function userFromToken(authorization) {
  const token = authorization?.replace(/^Bearer /, "");
  if (!token) return null;
  const direct = token.match(/^(akun|baru):(.+)$/);
  if (direct) {
    const [, kind, email] = direct;
    return users.get(email) ?? createUser(email, kind === "akun" ? { completed: true, displayName: "Sari" } : {});
  }
  const email = tokens.get(token);
  return email ? (users.get(email) ?? null) : null;
}

const SAMPLE_REPORTS = [
  { kind: "baru", status: "klarifikasi", placeName: "Masjid Al-Contoh", clarificationQuestion: "Apakah ramp-nya sampai ke pintu utama?", days: 1 },
  { kind: "kekurangan", status: "menunggu", placeName: "Halte contoh", days: 3 },
  { kind: "baru", status: "diterbitkan", placeName: "Kampus contoh A", days: 10 },
  { kind: "perubahan", status: "ditolak", placeName: "Rumah sakit contoh", rejectionReason: "bukti_tidak_cukup", days: 20 },
];

function sampleReports(user) {
  return SAMPLE_REPORTS.map(({ days, ...report }, i) => answered(user, {
    id: `00000000-0000-4000-8000-00000000000${i + 1}`,
    placeId: null,
    rejectionReason: null,
    clarificationQuestion: null,
    clarificationDueAt: null,
    decidedAt: report.status === "diterbitkan" || report.status === "ditolak" ? new Date(Date.UTC(2026, 9, 30 - days + 2)).toISOString() : null,
    submittedAt: new Date(Date.UTC(2026, 9, 30 - days)).toISOString(),
    ...report,
    // Pertanyaan contoh selalu masih bisa dijawab: tenggatnya 5 hari dari sekarang.
    ...(report.status === "klarifikasi" ? { clarificationDueAt: new Date(Date.now() + 5 * 24 * 3600_000).toISOString() } : {}),
  }));
}

/** Laporan contoh yang sudah dijawab pelapornya kembali menunggu verifikasi. */
function answered(user, report) {
  return user?.answers?.[report.id] ? { ...report, status: "menunggu", clarificationQuestion: null, clarificationDueAt: null } : report;
}

/** Satu laporan contoh dengan klarifikasinya, seperti GET /me/reports/{id}. */
function reportDetail(user, id) {
  const report = sampleReports(user).find((item) => item.id === id);
  if (!report) return null;
  const sample = SAMPLE_REPORTS.find((item) => item.placeName === report.placeName);
  const clarifications = sample.clarificationQuestion
    ? [{ id: `${id}-k`, question: sample.clarificationQuestion, askedAt: report.submittedAt, dueAt: new Date(Date.now() + 5 * 24 * 3600_000).toISOString(), answer: user.answers?.[id] ?? null, answeredAt: user.answers?.[id] ? new Date().toISOString() : null }]
    : [];
  return { id, kind: report.kind, status: report.status, placeId: report.placeId, placeName: report.placeName, submittedAt: report.submittedAt, photos: 2, clarifications };
}

/** Menjawab route akun, atau `null` bila bukan route akun. */
export function handleAkun(method, pathname, searchParams, headers, body) {
  if (method === "GET" && pathname === "/_tiruan/akun") return [200, { exists: users.has(searchParams.get("email")) }];
  if (method === "POST" && pathname === "/_tiruan/cabut-sesi") {
    for (const [token, email] of tokens) if (email === body?.email) tokens.delete(token);
    return [200, { ok: true }];
  }

  if (method === "POST" && pathname === "/auth/code") {
    const email = String(body?.email ?? "").trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return error(400, "input_tidak_valid", "Data yang dikirim tidak sesuai. Periksa lagi isiannya.");
    if (email.startsWith("gagal@")) return error(502, "email_gagal_dikirim", "Kode belum bisa dikirim. Coba lagi sebentar lagi.");
    const wait = 60 - Math.floor((Date.now() - (lastCodeAt.get(email) ?? 0)) / 1000);
    if (wait > 0) return error(429, "kode_terlalu_sering", `Tunggu ${wait} detik sebelum meminta kode baru.`, { "retry-after": String(wait) });
    lastCodeAt.set(email, Date.now());
    return [200, { resendAfterSeconds: 60, expiresInSeconds: 600 }];
  }

  if (method === "POST" && pathname === "/auth/code/verify") {
    const email = String(body?.email ?? "").toLowerCase();
    if (!/^\d{6}$/.test(String(body?.code ?? ""))) return error(400, "input_tidak_valid", "Data yang dikirim tidak sesuai. Periksa lagi isiannya.");
    if (body.code === "000000") return error(400, "kode_salah", "Kode salah. Sisa 4 kali percobaan.");
    if (body.code === "999999") return error(400, "kode_kedaluwarsa", "Kode sudah lewat 10 menit. Minta kode baru.");
    if (body.code !== "123456") return error(400, "kode_tidak_berlaku", "Kode ini tidak berlaku lagi. Minta kode baru.");
    return signIn(email);
  }

  if (method === "POST" && pathname === "/auth/google") {
    if (body?.idToken === "tiruan-google-belum") {
      return error(403, "email_google_belum_terverifikasi", "Email akun Google ini belum terverifikasi. Masuk dengan kode email.");
    }
    if (body?.idToken !== "tiruan-google") return error(401, "google_tidak_valid", "Masuk dengan Google gagal. Coba lagi, atau masuk dengan kode email.");
    return signIn("google@contoh.id", { displayName: "Budi Santoso" });
  }

  if (method === "POST" && pathname === "/auth/logout") {
    tokens.delete(headers.authorization?.replace(/^Bearer /, ""));
    return [204, null];
  }

  if (!pathname.startsWith("/me")) return null;
  const user = userFromToken(headers.authorization);
  if (!user) return error(401, "belum_masuk", "Sesi Anda sudah berakhir. Silakan masuk lagi.");

  if (method === "GET" && pathname === "/me") return [200, publicUser(user)];
  if (method === "POST" && pathname === "/me/complete") {
    if (body?.privacyPolicyVersion !== PRIVACY_POLICY_VERSION) {
      return error(409, "versi_kebijakan_berbeda", "Kebijakan Privasi baru saja diperbarui. Muat ulang halaman, baca versi terbaru, lalu setujui lagi.");
    }
    Object.assign(user, { displayName: String(body.displayName).trim(), completed: true });
    return [200, publicUser(user)];
  }
  if (method === "PATCH" && pathname === "/me") {
    user.displayName = String(body?.displayName ?? "").trim();
    return [200, publicUser(user)];
  }
  if (method === "GET" && pathname === "/me/reports") {
    // Laporan yang dikirim lewat Laporkan tiruan (laporkan.mjs) tampil paling atas.
    const sent = (user.reports ?? []).map(({ response }) => ({
      id: response.id,
      kind: response.kind,
      status: response.status,
      placeId: response.placeId,
      placeName: response.name,
      submittedAt: response.submittedAt,
      decidedAt: null,
      rejectionReason: null,
      clarificationQuestion: null,
      clarificationDueAt: null,
    }));
    return [200, { items: [...sent, ...(user.email.startsWith("pelapor") ? sampleReports(user) : [])] }];
  }
  const detail = pathname.match(/^\/me\/reports\/([^/]+)(\/clarification)?$/);
  if (detail && user.email.startsWith("pelapor")) {
    const report = reportDetail(user, detail[1]);
    if (!report) return error(404, "laporan_tidak_ditemukan", "Laporan ini tidak ditemukan di akun Anda.");
    if (method === "GET" && !detail[2]) return [200, report];
    if (method === "POST" && detail[2]) {
      if (report.status !== "klarifikasi") return error(409, "tidak_menunggu_jawaban", "Laporan ini tidak sedang menunggu jawaban Anda.");
      user.answers = { ...user.answers, [report.id]: String(body?.answer ?? "") };
      user.answerPhotos = body?.photos ?? [];
      return [200, { status: "menunggu" }];
    }
  }
  if (method === "DELETE" && pathname === "/me") {
    users.delete(user.email);
    for (const [token, email] of tokens) if (email === user.email) tokens.delete(token);
    return [204, null];
  }
  return null;
}
