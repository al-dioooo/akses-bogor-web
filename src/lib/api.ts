import { headers } from "next/headers";
import { connection } from "next/server";

// Tipe mengikuti docs/openapi.json di akses-bogor-api. Nilai enum adalah nilai produk; teks untuk
// pengguna disusun dari messages/id.json.
export const CATEGORIES = ["kampus", "masjid", "halte", "rumah_sakit"] as const;
export const STATUSES = ["aksesibel", "sebagian", "tidak_aksesibel", "belum_diketahui"] as const;
export const FACILITIES = ["ramp", "toilet_difabel", "guiding_block", "lift"] as const;

export type Category = (typeof CATEGORIES)[number];
export type Status = (typeof STATUSES)[number];
export type Facility = (typeof FACILITIES)[number];
export type Answer = "tersedia" | "tidak_tersedia" | "tidak_perlu" | "belum_tahu";
export type Reason = "tidak_ada" | "rusak" | "terhalang" | "terbatas" | "tidak_sesuai";
export type PhotoTag = "pintu_masuk" | "toilet_difabel" | "guiding_block" | "lift" | "lainnya";

export type District = { slug: string; name: string; city: string; places: number };

export type Photo = { id: string; url: string | null; alt: string; caption: string | null; tag: PhotoTag };

/** Ringkasan "X dari Y fasilitas" (ADR-0018). */
export type FacilitySummary = { available: number; relevant: number; unknown: number };

export type PlaceListItem = {
  id: string;
  name: string;
  category: Category;
  district: { slug: string; name: string };
  status: Status;
  summary: FacilitySummary;
  location: { lat: number; lng: number };
  lastVerifiedAt: string;
  coverPhoto: Photo | null;
};

export type PlaceDetail = Omit<PlaceListItem, "coverPhoto"> & {
  landmark: string | null;
  description: string | null;
  facilities: { facility: Facility; answer: Answer; reason: Reason | null; note: string | null }[];
  /** Fasilitas yang menentukan status; kosong bila Aksesibel. */
  because: { facility: Facility; answer: Answer; reason: Reason | null }[];
  photos: Photo[];
  needsRecheck: boolean;
};

export type PlaceList = { total: number; limit: number; offset: number; items: PlaceListItem[] };

export type Stats = {
  places: number;
  byCategory: Record<Category, number>;
  stepFreeEntrance: number;
  contributors: number;
};

export type PlaceFilters = {
  q?: string;
  category?: Category[];
  district?: string[];
  facility?: Facility[];
  status?: Status[];
  limit?: number;
  offset?: number;
};

/** Galat dari API dalam bentuk `{ galat, pesan }`, atau galat jaringan dengan kode `api_tidak_terhubung`. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly galat: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function apiUrl(path: string, query: Record<string, string | number | undefined> = {}) {
  const base = process.env.API_URL;
  if (!base) throw new ApiError(0, "api_belum_diatur", "API_URL belum diatur.");
  const url = new URL(path, base);
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== "") url.searchParams.set(key, String(value));
  }
  return url;
}

/**
 * Dengan `WEB_SERVER_SECRET`, setiap panggilan ikut membawa IP pengunjung supaya rate limit API dihitung per pengunjung,
 * bukan per IP server Vercel. Vercel menulis ulang `x-forwarded-for`, jadi isinya IP pengunjung yang asli.
 */
async function apiHeaders() {
  const result: Record<string, string> = { accept: "application/json" };
  const secret = process.env.WEB_SERVER_SECRET;
  if (!secret) return result;
  const visitorIp = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim();
  if (visitorIp) {
    result["x-web-server-secret"] = secret;
    result["x-visitor-ip"] = visitorIp;
  }
  return result;
}

async function get<T>(path: string, query?: Record<string, string | number | undefined>): Promise<T> {
  // Data lokasi selalu diambil saat request, tidak saat build, jadi build tidak butuh API.
  await connection();
  let response: Response;
  try {
    response = await fetch(apiUrl(path, query), { headers: await apiHeaders() });
  } catch {
    throw new ApiError(0, "api_tidak_terhubung", "API tidak bisa dihubungi.");
  }
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { galat?: string; pesan?: string } | null;
    throw new ApiError(response.status, body?.galat ?? "galat_api", body?.pesan ?? response.statusText);
  }
  return (await response.json()) as T;
}

const list = (values?: readonly string[]) => (values?.length ? values.join(",") : undefined);

export const getStats = () => get<Stats>("/places/stats");

export const getDistricts = () => get<District[]>("/districts");

export const getPlaces = (filters: PlaceFilters = {}) =>
  get<PlaceList>("/places", {
    q: filters.q,
    category: list(filters.category),
    district: list(filters.district),
    facility: list(filters.facility),
    status: list(filters.status),
    limit: filters.limit,
    offset: filters.offset,
  });

/** `null` bila lokasi tidak ada atau id-nya tidak valid. */
export async function getPlace(id: string): Promise<PlaceDetail | null> {
  try {
    return await get<PlaceDetail>(`/places/${encodeURIComponent(id)}`);
  } catch (error) {
    if (error instanceof ApiError && (error.status === 404 || error.status === 400)) return null;
    throw error;
  }
}
