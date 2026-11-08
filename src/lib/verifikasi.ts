import { call } from "./akun";
import { ApiError, apiHeaders, apiUrl, type Answer, type Category, type Facility, type Photo, type PhotoTag, type Reason, type Status } from "./api";
import type { LatLng, NearbyPlace, ReportKind } from "./laporan";

// Tipe mengikuti docs/openapi.json di akses-bogor-api (route /verifier, /admin, dan /me/reports/{id}). Semua fungsi di
// sini hanya dipanggil di server web dengan token sesi; browser tidak pernah memanggil API langsung (ADR-0029).

export type RejectionReason = "di_luar_kota_bogor" | "duplikat" | "bukti_tidak_cukup" | "bukan_fasilitas_publik" | "konten_tidak_pantas" | "tidak_ada_klarifikasi";
/** Alasan yang boleh dipilih verifikator; R6 hanya dipakai sistem (ADR-0036). */
export const VERIFIER_REASONS = ["di_luar_kota_bogor", "duplikat", "bukti_tidak_cukup", "bukan_fasilitas_publik", "konten_tidak_pantas"] as const satisfies readonly RejectionReason[];

export type QueueStatus = "menunggu" | "klarifikasi";

export type QueueItem = {
  id: string;
  kind: ReportKind;
  status: QueueStatus;
  placeId: string | null;
  name: string;
  category: Category;
  district: { slug: string; name: string };
  reporterName: string;
  photos: number;
  submittedAt: string;
  answered: boolean;
  clarificationDueAt: string | null;
  worsens: boolean;
};

export type Queue = { total: number; items: QueueItem[] };

export type FacilityValue = { facility: Facility; answer: Answer; reason: Reason | null; note: string | null };
export type StatusPreview = { status: Status; available: number; relevant: number; unknown: number };
/** Area kabur dalam pecahan 0 sampai 1 dari lebar dan tinggi foto (ADR-0037). */
export type BlurRegion = { x: number; y: number; w: number; h: number };

export type ReviewPhoto = {
  id: string;
  tag: PhotoTag;
  caption: string | null;
  alt: string;
  width: number;
  height: number;
  hidden: boolean;
  blur: BlurRegion[];
  clarificationId: string | null;
};

export type Clarification = { id: string; question: string; askedAt: string; dueAt: string; answer: string | null; answeredAt: string | null };

export type Review = {
  id: string;
  kind: ReportKind;
  status: QueueStatus | "diterbitkan" | "ditolak";
  submittedAt: string;
  decidedAt: string | null;
  rejectionReason: RejectionReason | null;
  reporterName: string | null;
  reviewerNote: string | null;
  submission: {
    name: string;
    category: Category;
    location: LatLng;
    district: { slug: string; name: string };
    landmark: string | null;
    description: string | null;
    facilities: FacilityValue[];
    status: StatusPreview;
  };
  photos: ReviewPhoto[];
  clarifications: Clarification[];
  place: {
    id: string;
    version: string;
    name: string;
    category: Category;
    location: LatLng;
    district: { slug: string; name: string };
    landmark: string | null;
    description: string | null;
    facilities: FacilityValue[];
    status: StatusPreview;
    lastVerifiedAt: string;
    photos: Photo[];
  } | null;
  nearby: NearbyPlace[];
};

export type RecheckItem = { id: string; name: string; category: Category; district: { slug: string; name: string }; status: Status; lastVerifiedAt: string };

export type Evidence = "terbukti" | "tanpa_bukti";
export type PublishInput = {
  placeVersion?: string;
  name?: string;
  category?: Category;
  location?: LatLng;
  landmark?: string | null;
  description: string | null;
  facilities: (FacilityValue & { evidence: Evidence })[];
  note?: string;
};

export type ModerationPatch = { hidden?: boolean; tag?: PhotoTag; caption?: string | null; blur?: BlurRegion[] };

export type TeamMember = { id: string; displayName: string; email: string; role: "verifikator" | "admin" };

export const getQueue = (token: string, status: QueueStatus) => call<Queue>("GET", `/verifier/reports?status=${status}`, { token });

/** `null` bila laporan tidak ada atau id-nya tidak valid. Laporan sendiri tetap menjadi `ApiError` 403. */
export async function getReview(token: string, id: string): Promise<Review | null> {
  try {
    return await call<Review>("GET", `/verifier/reports/${encodeURIComponent(id)}`, { token });
  } catch (error) {
    if (error instanceof ApiError && (error.status === 404 || error.status === 400)) return null;
    throw error;
  }
}

export const getRecheck = (token: string) => call<{ total: number; items: RecheckItem[] }>("GET", "/verifier/places/recheck", { token });

export const moderatePhoto = (token: string, reportId: string, photoId: string, patch: ModerationPatch) =>
  call<ReviewPhoto>("PATCH", `/verifier/reports/${encodeURIComponent(reportId)}/photos/${encodeURIComponent(photoId)}`, { token, body: patch });

export const publishReport = (token: string, id: string, input: PublishInput) =>
  call<{ status: "diterbitkan"; placeId: string }>("POST", `/verifier/reports/${encodeURIComponent(id)}/publish`, { token, body: input });

export const clarifyReport = (token: string, id: string, input: { question: string; note?: string }) =>
  call<{ status: "klarifikasi"; clarificationDueAt: string }>("POST", `/verifier/reports/${encodeURIComponent(id)}/clarify`, { token, body: input });

export const rejectReport = (token: string, id: string, input: { reason: RejectionReason; note?: string }) =>
  call<{ status: "ditolak" }>("POST", `/verifier/reports/${encodeURIComponent(id)}/reject`, { token, body: input });

export const getTeam = (token: string) => call<{ items: TeamMember[] }>("GET", "/admin/team", { token });
export const addVerifier = (token: string, email: string) => call<TeamMember>("POST", "/admin/team", { token, body: { email } });
export const removeVerifier = (token: string, userId: string) => call<void>("DELETE", `/admin/team/${encodeURIComponent(userId)}`, { token });

/**
 * Foto laporan yang belum terbit, apa adanya dari API (ADR-0031). `versi=kabur` memakai area kabur yang tersimpan.
 * Dipanggil route handler `/verifikasi/foto/[id]`, yang meneruskan berkasnya ke browser verifikator.
 */
export async function fetchReviewPhoto(token: string, id: string, versi: "asli" | "kabur") {
  const headers = { ...(await apiHeaders()), accept: "image/webp", authorization: `Bearer ${token}` };
  try {
    return await fetch(apiUrl(`/verifier/photos/${encodeURIComponent(id)}`, { versi }), { headers, cache: "no-store" });
  } catch {
    return null;
  }
}
