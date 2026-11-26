import { call } from "./akun";
import { ApiError, type Answer, type Category, type Facility, type Photo, type PhotoTag, type Reason, type Status } from "./api";
import type { LatLng } from "./laporan";

// Kelola tempat oleh admin (ADR-0051). Tipe mengikuti docs/openapi.json di akses-bogor-api (route /admin/places dan
// /admin/candidates). Semua fungsi di sini hanya dipanggil di server web dengan token sesi (ADR-0029); API memeriksa
// peran admin di setiap route.

export type Origin = "tim" | "admin";

export type AdminPlaceQuery = {
  q?: string;
  category?: Category;
  district?: string;
  status?: Status;
  origin?: Origin;
  published?: "ya" | "tidak";
  limit?: number;
  offset?: number;
};

export type AdminPlaceItem = {
  id: string;
  name: string;
  category: Category;
  district: { slug: string; name: string };
  status: Status;
  summary: { available: number; relevant: number; unknown: number };
  verifiedBy: Origin;
  lastVerifiedAt: string;
  updatedAt: string;
  published: boolean;
  unpublishedAt: string | null;
  unpublishedReason: string | null;
};

export type AdminPlaceList = { total: number; limit: number; offset: number; items: AdminPlaceItem[] };

export type AdminFacility = { facility: Facility; answer: Answer; reason: Reason | null; note: string | null };

export type AdminPlace = AdminPlaceItem & {
  version: string;
  location: LatLng;
  landmark: string | null;
  description: string | null;
  facilities: AdminFacility[];
  photos: Photo[];
  adminPublishedBy: string | null;
};

export type HistoryEntry = {
  id: number;
  /** `foto`: foto tayang tempat ini yang dihapus; `changes` berisi `tag` dan `alasan`. API lama tidak mengirimnya. */
  entity?: "lokasi" | "foto";
  photoId?: string | null;
  action: string;
  actor: { name: string | null; label: "sistem" | "skrip" | null };
  at: string;
  changes: Record<string, unknown> | null;
};

export type Candidate = {
  osmType: "node" | "way" | "relation";
  osmId: number;
  name: string | null;
  category: Category;
  district: { slug: string; name: string };
  location: LatLng;
  wheelchair: string | null;
};

export type CandidateList = { total: number; limit: number; offset: number; items: Candidate[]; attribution: string };

export type PlaceInput = {
  name: string;
  category: Category;
  location: LatLng;
  landmark: string | null;
  description: string | null;
  facilities: { facility: Facility; answer: Answer; reason?: Reason; note?: string }[];
  photos: { id: string; tag: PhotoTag; caption?: string }[];
  reason: string;
  osm?: { type: Candidate["osmType"]; id: number };
};

export type SaveResult = { placeId: string; status: Status; downgraded: Facility[] };

/** Nilai kosong tidak dikirim, supaya API memakai bawaannya. */
const queryString = (query: Record<string, string | number | undefined>) => {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) if (value !== undefined && value !== "") params.set(key, String(value));
  const text = params.toString();
  return text ? `?${text}` : "";
};

export const listAdminPlaces = (token: string, query: AdminPlaceQuery) => call<AdminPlaceList>("GET", `/admin/places${queryString(query)}`, { token });

/** `null` bila tempatnya tidak ada. */
export async function getAdminPlace(token: string, id: string): Promise<AdminPlace | null> {
  try {
    return await call<AdminPlace>("GET", `/admin/places/${encodeURIComponent(id)}`, { token });
  } catch (error) {
    if (error instanceof ApiError && (error.status === 404 || error.status === 400)) return null;
    throw error;
  }
}

export const getPlaceHistory = (token: string, id: string) => call<{ items: HistoryEntry[] }>("GET", `/admin/places/${encodeURIComponent(id)}/history`, { token });

export const listCandidates = (token: string, query: { q?: string; category?: Category; district?: string; limit?: number; offset?: number }) =>
  call<CandidateList>("GET", `/admin/candidates${queryString(query)}`, { token });

export const createPlace = (token: string, input: PlaceInput) => call<SaveResult>("POST", "/admin/places", { token, body: input });

export const updatePlace = (token: string, id: string, input: Omit<PlaceInput, "osm"> & { version: string; removePhotos: string[] }) =>
  call<SaveResult>("PATCH", `/admin/places/${encodeURIComponent(id)}`, { token, body: input });

export const unpublishPlace = (token: string, id: string, reason: string) => call<void>("DELETE", `/admin/places/${encodeURIComponent(id)}`, { token, body: { reason } });

export const restorePlace = (token: string, id: string, reason: string) => call<void>("POST", `/admin/places/${encodeURIComponent(id)}/restore`, { token, body: { reason } });

/** Tag foto yang menjadi bukti setiap fasilitas (Panduan Verifikasi bagian 5), sama dengan API. */
export const EVIDENCE_TAG: Record<Facility, PhotoTag> = { ramp: "pintu_masuk", toilet_difabel: "toilet_difabel", guiding_block: "guiding_block", lift: "lift" };

/**
 * Fasilitas yang akan disimpan sebagai Belum tahu karena dijawab Tersedia atau Tidak perlu tanpa foto bertag fasilitas
 * itu (ADR-0051). Dipakai formulir untuk memperingatkan sebelum disimpan; API yang menerapkannya.
 */
export function withoutEvidence(facilities: { facility: Facility; answer: Answer }[], tags: Iterable<PhotoTag | "">): Facility[] {
  const shown = new Set(tags);
  return facilities.filter((f) => (f.answer === "tersedia" || f.answer === "tidak_perlu") && !shown.has(EVIDENCE_TAG[f.facility])).map((f) => f.facility);
}
