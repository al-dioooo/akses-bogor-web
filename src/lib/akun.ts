import { ApiError, apiHeaders, apiUrl } from "./api";

// Tipe mengikuti docs/openapi.json di akses-bogor-api (route /auth dan /me). Semua fungsi di sini hanya dipanggil di
// server: token sesi tidak pernah sampai ke kode browser (ADR-0029).

export type Role = "pengguna" | "verifikator" | "admin";

export type User = {
  id: string;
  displayName: string;
  email: string;
  role: Role;
  /** Belum ada nama tampilan atau persetujuan Kebijakan Privasi versi terbaru: arahkan ke Lengkapi Akun. */
  needsCompletion: boolean;
  createdAt: string;
};

export type SignedIn = { token: string; expiresAt: string; user: User };

export type CodeSent = { resendAfterSeconds: number; expiresInSeconds: number };

export const REPORT_STATUSES = ["menunggu", "klarifikasi", "diterbitkan", "ditolak"] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];
export type ReportKind = "baru" | "perubahan" | "kekurangan";
export type RejectionReason =
  | "di_luar_kota_bogor"
  | "duplikat"
  | "bukti_tidak_cukup"
  | "bukan_fasilitas_publik"
  | "konten_tidak_pantas"
  | "tidak_ada_klarifikasi";

export type MyReport = {
  id: string;
  kind: ReportKind;
  status: ReportStatus;
  placeId: string | null;
  placeName: string | null;
  submittedAt: string;
  decidedAt: string | null;
  rejectionReason: RejectionReason | null;
  clarificationQuestion: string | null;
  clarificationDueAt: string | null;
};

export type Options = { token?: string; body?: unknown };

/** Panggilan API dari server web dengan token sesi; galat menjadi `ApiError`. Dipakai juga oleh `lib/verifikasi.ts`. */
export async function call<T>(method: "GET" | "POST" | "PATCH" | "DELETE", path: string, { token, body }: Options = {}): Promise<T> {
  const headers = await apiHeaders();
  if (token) headers.authorization = `Bearer ${token}`;
  if (body !== undefined) headers["content-type"] = "application/json";
  let response: Response;
  try {
    response = await fetch(apiUrl(path), { method, headers, body: body === undefined ? undefined : JSON.stringify(body), cache: "no-store" });
  } catch {
    throw new ApiError(0, "api_tidak_terhubung", "Server AksesBogor tidak bisa dihubungi. Coba lagi sebentar lagi.");
  }
  if (!response.ok) {
    const error = (await response.json().catch(() => null)) as { galat?: string; pesan?: string } | null;
    const retryAfter = Number(response.headers.get("retry-after"));
    throw new ApiError(
      response.status,
      error?.galat ?? "galat_api",
      error?.pesan ?? "Terjadi kesalahan. Coba lagi.",
      Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : undefined,
    );
  }
  return (response.status === 204 ? undefined : await response.json()) as T;
}

export const requestCode = (email: string) => call<CodeSent>("POST", "/auth/code", { body: { email } });

export const verifyCode = (email: string, code: string) => call<SignedIn>("POST", "/auth/code/verify", { body: { email, code } });

export const signInWithGoogle = (idToken: string) => call<SignedIn>("POST", "/auth/google", { body: { idToken } });

export const logout = (token: string) => call<void>("POST", "/auth/logout", { token });

/** `null` bila sesinya tidak berlaku lagi. */
export async function getMe(token: string): Promise<User | null> {
  try {
    return await call<User>("GET", "/me", { token });
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return null;
    throw error;
  }
}

export const completeAccount = (token: string, input: { displayName: string; privacyPolicyVersion: string }) =>
  call<User>("POST", "/me/complete", { token, body: { ...input, acceptPrivacyPolicy: true } });

export const renameAccount = (token: string, displayName: string) => call<User>("PATCH", "/me", { token, body: { displayName } });

export const getMyReports = (token: string) => call<{ items: MyReport[] }>("GET", "/me/reports", { token });

export const deleteAccount = (token: string) => call<void>("DELETE", "/me", { token });

export type MyReportDetail = Pick<MyReport, "id" | "kind" | "status" | "placeId" | "submittedAt"> & {
  placeName: string;
  /** Foto laporan; jawaban klarifikasi boleh menambah sampai total 10 (ADR-0023). */
  photos: number;
  clarifications: { id: string; question: string; askedAt: string; dueAt: string; answer: string | null; answeredAt: string | null }[];
};

/** `null` bila laporan tidak ada atau milik akun lain. */
export async function getMyReport(token: string, id: string): Promise<MyReportDetail | null> {
  try {
    return await call<MyReportDetail>("GET", `/me/reports/${encodeURIComponent(id)}`, { token });
  } catch (error) {
    if (error instanceof ApiError && (error.status === 404 || error.status === 400)) return null;
    throw error;
  }
}

/** Jawaban klarifikasi dengan foto yang sudah diunggah lewat `/laporkan/foto` (ADR-0036). */
export const answerClarification = (token: string, id: string, body: { answer: string; photos: { id: string; tag: string; caption?: string }[] }) =>
  call<{ status: "menunggu" }>("POST", `/me/reports/${encodeURIComponent(id)}/clarification`, { token, body });
