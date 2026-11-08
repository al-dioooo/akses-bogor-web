import { ApiError, apiHeaders, apiUrl, type Answer, type Category, type Facility, type PhotoTag, type Reason, type Status } from "./api";

// Tipe mengikuti docs/openapi.json di akses-bogor-api (route Laporkan dan /map/search). Fungsi di sini hanya dipanggil
// di server web: route handler /laporkan/* meneruskan permintaan browser ke API (ADR-0029, ADR-0033).

export type LatLng = { lat: number; lng: number };
export type District = { slug: string; name: string };

/** Lokasi terbit yang mungkin sama dengan tempat yang dilaporkan (FR-23). */
export type NearbyPlace = { id: string; name: string; category: Category; status: Status; distanceMeters: number };
export type LocationCheck = { district: District; nearby: NearbyPlace[] };

/** Hasil pencarian tempat (ADR-0032): lokasi AksesBogor lebih dulu, lalu hasil Mapbox yang hanya menggeser peta. */
export type SearchResults = {
  places: { id: string; name: string; category: Category; status: Status; district: District; location: LatLng }[];
  results: { name: string; address: string | null; location: LatLng; kind: string }[];
};

export type ReportKind = "baru" | "perubahan" | "kekurangan";

export type ReportPayload = {
  submissionKey: string;
  kind: ReportKind;
  placeId?: string;
  name?: string;
  category?: Category;
  location?: LatLng;
  landmark?: string;
  description?: string;
  facilities: { facility: Facility; answer: Answer; reason?: Reason; note?: string }[];
  photos: { id: string; tag: PhotoTag; caption?: string }[];
};

export type SubmittedReport = {
  id: string;
  kind: ReportKind;
  status: "menunggu";
  placeId: string | null;
  name: string;
  district: District;
  photos: number;
  submittedAt: string;
};

export type UploadedPhoto = { id: string; width: number; height: number; bytes: number };

type Body = { json: unknown } | { bytes: ArrayBuffer; contentType: string };

/** POST ke API. Galat menjadi `ApiError` dengan `{ galat, pesan }` dari API, atau `api_tidak_terhubung`. */
async function post<T>(path: string, body: Body, token?: string): Promise<T> {
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

/** Kecamatan dari titik dan lokasi mirip di sekitar; titik di luar Kota Bogor menjadi 422 `di_luar_kota_bogor`. */
export const checkLocation = (input: { location: LatLng; name?: string; placeId?: string }) =>
  post<LocationCheck>("/reports/location-check", { json: input });

export const searchPlaces = (input: { q: string; near?: LatLng }) => post<SearchResults>("/map/search", { json: input });

export const uploadPhoto = (token: string, bytes: ArrayBuffer, contentType: string) =>
  post<UploadedPhoto>("/reports/photos", { bytes, contentType }, token);

export const sendReport = (token: string, payload: ReportPayload) => post<SubmittedReport>("/reports", { json: payload }, token);
