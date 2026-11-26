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
  /** Waktu verifikasi terakhir, atau waktu admin menerbitkan bila `verifiedBy` bernilai `admin`. */
  lastVerifiedAt: string;
  /**
   * `admin`: dibuat, diubah, atau diterbitkan langsung oleh admin tanpa pemeriksaan orang kedua; ditulis "Diterbitkan
   * langsung oleh admin", tidak pernah "Diverifikasi" (ADR-0051). Kosong di API lama, dianggap `tim`.
   */
  verifiedBy?: "tim" | "admin";
  coverPhoto: Photo | null;
};

/** Data terakhir diterbitkan admin, bukan diverifikasi orang kedua (ADR-0051). */
export const byAdmin = (place: { verifiedBy?: "tim" | "admin" }) => place.verifiedBy === "admin";

export type PlaceDetail = Omit<PlaceListItem, "coverPhoto"> & {
  landmark: string | null;
  description: string | null;
  facilities: { facility: Facility; answer: Answer; reason: Reason | null; note: string | null }[];
  /** Fasilitas yang menentukan status; kosong bila Aksesibel. */
  because: { facility: Facility; answer: Answer; reason: Reason | null }[];
  photos: Photo[];
  needsRecheck: boolean;
  /** Versi data lokasi; draf Laporkan menyimpannya untuk terbit langsung oleh admin (ADR-0051). API lama tidak mengirimnya. */
  version?: string;
};

export type PlaceList = { total: number; limit: number; offset: number; items: PlaceListItem[] };

export type Stats = {
  places: number;
  byCategory: Record<Category, number>;
  stepFreeEntrance: number;
  contributors: number;
};

/** Satu titik di peta: GeoJSON Feature dari `GET /places/map`, koordinat `[lng, lat]`. */
export type MapFeature = {
  type: "Feature";
  id: string;
  geometry: { type: "Point"; coordinates: [number, number] };
  properties: { name: string; category: Category; status: Status };
};

export type PlaceMap = { type: "FeatureCollection"; features: MapFeature[] };

/**
 * Kandidat "Belum ada data" dari OpenStreetMap (ADR-0049): tempat yang belum punya lokasi AksesBogor. Bukan lokasi
 * terverifikasi dan tidak punya status; `wheelchair` adalah nilai mentah tag OSM. Id-nya tipe dan id OSM, mis. `node/1`.
 */
export type CandidateFeature = {
  type: "Feature";
  id: string;
  geometry: { type: "Point"; coordinates: [number, number] };
  properties: { osmType: "node" | "way" | "relation"; osmId: number; name: string | null; category: Category; district: { slug: string; name: string }; wheelchair: string | null };
};
export type CandidateSource = { title: string; license: string; attribution: string; url: string; retrievedAt: string | null };
export type CandidateMap = { type: "FeatureCollection"; features: CandidateFeature[]; source: CandidateSource };

/**
 * Petunjuk aksesibilitas langsung dari penyedia peta (ADR-0052): bukan data AksesBogor, belum diperiksa tim, tidak
 * disimpan, dan tidak pernah mengubah status. Satu baris per penyedia yang menyala; kosong bila petunjuk dimatikan.
 */
export type ProviderHint =
  | { provider: "mapbox"; result: "found"; placeName: string; distanceMeters: number; wheelchairAccessible: boolean }
  | {
      provider: "google";
      result: "found";
      placeName: string;
      distanceMeters: number;
      url: string | null;
      accessibility: { entrance: boolean | null; restroom: boolean | null; parking: boolean | null; seating: boolean | null };
    }
  | {
      /** Salinan Google Maps yang tersimpan di baris kandidat OSM, dengan tanggal pengambilannya (YYYY-MM-DD, WIB). */
      provider: "google";
      result: "stored";
      placeName: string | null;
      distanceMeters: number | null;
      url: string | null;
      retrievedAt: string;
      accessibility: { entrance: boolean | null; restroom: boolean | null; parking: boolean | null; seating: boolean | null };
    }
  | { provider: "openstreetmap"; result: "stored"; wheelchair: "yes" | "limited" | "no" | "designated" }
  | { provider: "mapbox" | "google"; result: "none" | "unavailable" };
export type ProviderHints = { hints: ProviderHint[] };
/** Jawaban petunjuk untuk web: `off` bila API mematikan petunjuk atau belum punya route-nya. */
export type HintsAnswer = ProviderHints & { off: boolean };

export type PriorityLevel = "rendah" | "sedang" | "tinggi" | "sangat_tinggi";

/** Prioritas kecamatan dari data penyandang disabilitas terdaftar; sama dengan GET /districts/priority. */
export type DistrictPriority = {
  year: number;
  /** Jumlah terdaftar per tahun untuk seluruh kota; belum ditampilkan. */
  yearTotals?: { year: number; registered: number }[];
  /** Cara menghitung skor, dalam bahasa Indonesia. */
  formula?: string;
  /** Asal hitungan fasilitas tanpa data (OpenStreetMap) dan atribusinya. */
  facilitiesSource?: { retrievedAt: string | null; attribution: string };
  districts: { slug: string; name: string; registered: number; verifiedPlaces: number; facilitiesWithoutData: number; score: number; rank: number; level: PriorityLevel }[];
  caveat: string;
  source: { title: string; url: string; publisher: string; retrievedAt: string; terms: string };
};

/** Batas kecamatan dari OpenStreetMap (ADR-0034), disederhanakan untuk peta; data ODbL. */
export type DistrictBoundaries = {
  type: "FeatureCollection";
  features: { type: "Feature"; properties: { slug: string; name: string }; geometry: { type: "Polygon" | "MultiPolygon"; coordinates: unknown } }[];
  attribution: string;
};

/** Token Mapbox sementara dari API (ADR-0016). */
export type MapToken = { token: string; expiresAt: string };

export type PlaceFilters = {
  q?: string;
  category?: Category[];
  district?: string[];
  facility?: Facility[];
  status?: Status[];
  limit?: number;
  offset?: number;
};

/**
 * Galat dari API dalam bentuk `{ galat, pesan }`, atau galat jaringan dengan kode `api_tidak_terhubung`. `pesan` dari
 * API sudah berbahasa Indonesia untuk pengguna. `retryAfterSeconds` diisi dari header `retry-after` pada 429.
 */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly galat: string,
    message: string,
    readonly retryAfterSeconds?: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function apiUrl(path: string, query: Record<string, string | number | undefined> = {}) {
  const base = process.env.API_URL;
  if (!base) throw new ApiError(0, "api_belum_diatur", "API_URL belum diatur.");
  const url = new URL(path, base);
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== "") url.searchParams.set(key, String(value));
  }
  return url;
}

/**
 * IP pengunjung dari header permintaan. Web berjalan di balik Cloudflare Tunnel, dan Cloudflare selalu menulis ulang
 * `cf-connecting-ip`, sama seperti yang dibaca API. `x-forwarded-for` tidak bisa dipercaya di sana: Cloudflare hanya
 * menambahkan IP asli di belakang nilai yang dikirim klien, dan `next start` tidak mengubahnya. Header itu hanya
 * dipakai bila `cf-connecting-ip` tidak ada, yaitu di lokal dan di tes.
 */
export function visitorIp(requestHeaders: Pick<Headers, "get">) {
  const cloudflare = requestHeaders.get("cf-connecting-ip")?.trim();
  if (cloudflare) return cloudflare;
  return requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() || undefined;
}

/**
 * Header untuk setiap panggilan API dari server web: halaman, route handler (foto, kirim laporan, cari tempat, cek
 * lokasi, kunci peta, foto verifikator), dan server action (akun, verifikasi). Dengan `WEB_SERVER_SECRET`, panggilan
 * ikut membawa IP pengunjung supaya rate limit API, termasuk batas kode masuk dan unggah foto, dihitung per pengunjung,
 * bukan per IP server web.
 */
export async function apiHeaders(): Promise<Record<string, string>> {
  if (!process.env.WEB_SERVER_SECRET) return { accept: "application/json" };
  // Diimpor saat dipanggil: komponen klien ikut mengimpor konstanta dari modul ini, dan next/headers hanya boleh ada
  // di sisi server.
  const { headers } = await import("next/headers");
  return visitorHeaders(await headers());
}

/** Header `apiHeaders` dari header permintaan yang sudah ada, untuk src/proxy.ts yang tidak bisa memakai next/headers. */
export function visitorHeaders(requestHeaders: Pick<Headers, "get">): Record<string, string> {
  const result: Record<string, string> = { accept: "application/json" };
  const secret = process.env.WEB_SERVER_SECRET;
  if (!secret) return result;
  const ip = visitorIp(requestHeaders);
  if (ip) {
    result["x-web-server-secret"] = secret;
    result["x-visitor-ip"] = ip;
  }
  return result;
}

/**
 * Apakah lokasi tayang, dicek src/proxy.ts sebelum halaman Detail dirender (issue #150). `tidak_ada` untuk 404 dan id
 * yang tidak valid (400), seperti `getPlace`; `galat` untuk jawaban lain dan API yang tidak bisa dihubungi. Memakai HEAD
 * supaya isi lokasi tidak dikirim dua kali; halaman tetap mengambil isinya sendiri.
 */
export async function placeExists(id: string, requestHeaders: Pick<Headers, "get">): Promise<"ada" | "tidak_ada" | "galat"> {
  let response: Response;
  try {
    response = await fetch(apiUrl(`/places/${encodeURIComponent(id)}`), {
      method: "HEAD",
      headers: visitorHeaders(requestHeaders),
      cache: "no-store",
    });
  } catch {
    return "galat";
  }
  if (response.ok) return "ada";
  return response.status === 404 || response.status === 400 ? "tidak_ada" : "galat";
}

/** Badan POST ke API: JSON, atau byte mentah dengan jenis isinya (foto). */
export type PostBody = { json: unknown } | { bytes: ArrayBuffer; contentType: string };

/** POST ke API dari server web. Galat menjadi `ApiError` dengan `{ galat, pesan }` dari API, atau `api_tidak_terhubung`. */
export async function apiPost<T>(path: string, body: PostBody, token?: string): Promise<T> {
  const headers = await apiHeaders();
  if (token) headers.authorization = `Bearer ${token}`;
  headers["content-type"] = "json" in body ? "application/json" : body.contentType;
  let response: Response;
  try {
    response = await fetch(apiUrl(path), {
      method: "POST",
      headers,
      body: "json" in body ? JSON.stringify(body.json) : body.bytes,
      cache: "no-store",
    });
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
  return (await response.json()) as T;
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

const filterQuery = (filters: PlaceFilters) => ({
  q: filters.q,
  category: list(filters.category),
  district: list(filters.district),
  facility: list(filters.facility),
  status: list(filters.status),
});

export const getPlaces = (filters: PlaceFilters = {}) =>
  get<PlaceList>("/places", { ...filterQuery(filters), limit: filters.limit, offset: filters.offset });

/** Semua titik yang cocok dengan filter, paling banyak 2000 (FR-05). */
export const getMapPlaces = (filters: Omit<PlaceFilters, "limit" | "offset"> = {}) =>
  get<PlaceMap>("/places/map", filterQuery(filters));

/**
 * Kandidat yang cocok dengan filter nama, kategori, dan kecamatan, atau `null` bila API belum punya route ini atau
 * tidak terhubung. Peta tetap tampil tanpa lapisannya.
 */
export async function getCandidates(filters: Pick<PlaceFilters, "q" | "category" | "district"> = {}): Promise<CandidateMap | null> {
  try {
    return await get<CandidateMap>("/places/candidates", { q: filters.q, category: list(filters.category), district: list(filters.district) });
  } catch (error) {
    if (error instanceof ApiError) return null;
    throw error;
  }
}

/**
 * Petunjuk penyedia untuk lokasi AksesBogor atau kandidat OSM, tidak pernah di-cache. API yang belum punya route ini,
 * atau tempat yang tidak ditemukan, dijawab seperti petunjuk yang dimatikan (`hints: []`).
 */
export async function getProviderHints(target: { lokasi: string } | { osm: { type: string; id: number } }): Promise<HintsAnswer> {
  const path = "lokasi" in target ? `/places/${encodeURIComponent(target.lokasi)}/hints` : `/places/candidates/${target.osm.type}/${target.osm.id}/hints`;
  try {
    // API menjawab `hints: []` hanya selama petunjuk dimatikan.
    const { hints } = await get<ProviderHints>(path);
    return { hints, off: hints.length === 0 };
  } catch (error) {
    // Tempat atau kandidat yang tidak dikenal (mis. kandidat usang) hanya berarti tidak ada petunjuk untuk tempat itu;
    // route yang tidak ada berarti API ini belum punya petunjuk.
    if (error instanceof ApiError && error.status === 404) return { hints: [], off: !/^(lokasi|kandidat)_tidak_ditemukan$/.test(error.galat) };
    throw error;
  }
}

/** Token peta untuk browser. API menjawab 503 `peta_belum_diatur` bila Mapbox belum diatur di server. */
export const getMapToken = () => get<MapToken>("/map/token");

/**
 * Prioritas kecamatan dari data penyandang disabilitas terdaftar (ADR-0043), atau `null` selama API belum membukanya
 * (503 `data_disabilitas_belum_aktif`), API belum punya route ini, atau API tidak terhubung. Peta tetap tampil tanpanya.
 */
export async function getDistrictPriority(): Promise<DistrictPriority | null> {
  try {
    return await get<DistrictPriority>("/districts/priority");
  } catch (error) {
    if (error instanceof ApiError) return null;
    throw error;
  }
}

/** Batas keenam kecamatan untuk lapisan peta. Publik dan jarang berubah. */
export const getDistrictBoundaries = () => get<DistrictBoundaries>("/districts/boundaries");

/** `null` bila lokasi tidak ada atau id-nya tidak valid. */
export async function getPlace(id: string): Promise<PlaceDetail | null> {
  try {
    return await get<PlaceDetail>(`/places/${encodeURIComponent(id)}`);
  } catch (error) {
    if (error instanceof ApiError && (error.status === 404 || error.status === 400)) return null;
    throw error;
  }
}
