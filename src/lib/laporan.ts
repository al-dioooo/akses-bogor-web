import { apiPost as post, type Answer, type Category, type Facility, type PhotoTag, type Reason, type Status } from "./api";

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
  /** Khusus admin: terbitkan langsung tanpa pemeriksaan orang kedua, dengan alasan (ADR-0051). */
  publishDirectly?: true;
  publishReason?: string;
  /** Versi lokasi saat draf dibuat, hanya untuk terbit langsung Edit lokasi dan Laporkan kekurangan. */
  placeVersion?: string;
};

export type SubmittedReport = {
  id: string;
  kind: ReportKind;
  /** `diterbitkan` hanya untuk terbit langsung oleh admin. */
  status: "menunggu" | "diterbitkan";
  placeId: string | null;
  name: string;
  district: District;
  photos: number;
  submittedAt: string;
  /** Terbit langsung: fasilitas Tersedia atau Tidak perlu tanpa foto yang sesuai, disimpan sebagai Belum diketahui. */
  downgraded?: Facility[];
};

export type UploadedPhoto = { id: string; width: number; height: number; bytes: number };

/** Kecamatan dari titik dan lokasi mirip di sekitar; titik di luar Kota Bogor menjadi 422 `di_luar_kota_bogor`. */
export const checkLocation = (input: { location: LatLng; name?: string; placeId?: string }) =>
  post<LocationCheck>("/reports/location-check", { json: input });

export const searchPlaces = (input: { q: string; near?: LatLng }) => post<SearchResults>("/map/search", { json: input });

export const uploadPhoto = (token: string, bytes: ArrayBuffer, contentType: string) =>
  post<UploadedPhoto>("/reports/photos", { bytes, contentType }, token);

export const sendReport = (token: string, payload: ReportPayload) => post<SubmittedReport>("/reports", { json: payload }, token);
