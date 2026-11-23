import { CATEGORIES, FACILITIES, type Answer, type Category, type Facility, type PhotoTag, type PlaceDetail, type Reason } from "./api";
import type { CandidatePrefill } from "./kandidat";
import type { District, LatLng, ReportKind, ReportPayload } from "./laporan";

// Model formulir Laporkan (FR-21 sampai FR-25): isian yang disimpan di draf perangkat (ADR-0033), pemeriksaan per
// langkah, dan isi yang dikirim ke API. Teks galat ada di messages/id.json; di sini hanya kuncinya.

export const STEPS = ["1", "2", "3", "ringkasan"] as const;
export type Step = (typeof STEPS)[number];

export const PHOTO_TAGS = ["pintu_masuk", "toilet_difabel", "guiding_block", "lift", "lainnya"] as const satisfies readonly PhotoTag[];
export const ANSWERS = ["tersedia", "tidak_tersedia", "tidak_perlu", "belum_tahu"] as const satisfies readonly Answer[];
export const REASONS = ["tidak_ada", "rusak", "terhalang", "terbatas", "tidak_sesuai"] as const satisfies readonly Reason[];

export const LIMITS = { name: 120, landmark: 140, note: 200, caption: 200, description: 1000, photos: 10 } as const;

export type FacilityState = { answer: Answer; reason: Reason | null; note: string };

export type PhotoDraft = {
  /** Kunci lokal foto di draf. */
  key: string;
  /** Foto yang sudah diperkecil di browser (JPEG). */
  blob: Blob;
  name: string;
  width: number;
  height: number;
  tag: PhotoTag | "";
  caption: string;
  /** Id dari API setelah diunggah, supaya kirim ulang tidak mengunggah dua kali. */
  uploadedId: string | null;
};

export type ConfirmedLocation = { point: LatLng; district: District };

export type ReportDraft = {
  /**
   * "baru", "osm:<tipe>/<id>" untuk laporan baru dari kandidat OpenStreetMap (ADR-0049), atau "<jenis>:<id lokasi>"
   * untuk Edit lokasi dan Laporkan kekurangan.
   */
  draftKey: string;
  /** Kunci acak yang dikirim ke API supaya kirim ulang tidak membuat laporan kedua. */
  submissionKey: string;
  kind: ReportKind;
  placeId: string | null;
  name: string;
  category: Category | "";
  landmark: string;
  description: string;
  /** Pin yang dikonfirmasi pelapor dan sudah dicek kecamatannya; null sampai "Pakai lokasi ini" berhasil. */
  location: ConfirmedLocation | null;
  /**
   * Kandidat OpenStreetMap asal laporan baru, mis. "node/1", dan titiknya sebagai pin awal yang belum dikonfirmasi.
   * Hanya untuk draf dan tampilan, tidak dikirim ke API. Tidak ada di draf lama.
   */
  osm?: string | null;
  start?: LatLng | null;
  facilities: Record<Facility, FacilityState>;
  photos: PhotoDraft[];
  /** Khusus admin: terbitkan langsung dengan alasan (ADR-0050). Akun lain tidak melihat pilihannya, dan API menolaknya. */
  publishDirectly?: boolean;
  publishReason?: string;
  updatedAt: number;
};

/** Alasan terbit langsung paling sedikit 5 karakter, sama dengan API. */
export const directReasonMissing = (draft: Pick<ReportDraft, "publishDirectly" | "publishReason">) => Boolean(draft.publishDirectly) && (draft.publishReason ?? "").trim().length < 5;

export const draftKeyFor = (kind: ReportKind, placeId: string | null, osm: string | null = null) =>
  kind === "baru" || !placeId ? (osm ? `osm:${osm}` : "baru") : `${kind}:${placeId}`;

const unknownFacilities = () =>
  Object.fromEntries(FACILITIES.map((facility) => [facility, { answer: "belum_tahu", reason: null, note: "" }])) as Record<Facility, FacilityState>;

/**
 * Draf kosong untuk laporan baru, laporan baru dari kandidat OpenStreetMap (nama, kategori, dan pin awal dari URL,
 * ADR-0049), atau draf terisi data lokasi saat ini untuk Edit lokasi dan Laporkan kekurangan (FR-27).
 */
export function newDraft(
  kind: ReportKind,
  place: PlaceDetail | null,
  now = Date.now(),
  uuid = () => crypto.randomUUID(),
  prefill: CandidatePrefill | null = null,
): ReportDraft {
  const facilities = unknownFacilities();
  for (const f of place?.facilities ?? []) facilities[f.facility] = { answer: f.answer, reason: f.reason, note: f.note ?? "" };
  const candidate = place ? null : prefill;
  return {
    draftKey: draftKeyFor(place ? kind : "baru", place?.id ?? null, candidate?.osm),
    submissionKey: uuid(),
    kind: place ? kind : "baru",
    placeId: place?.id ?? null,
    name: place?.name ?? candidate?.name ?? "",
    category: place?.category ?? candidate?.category ?? "",
    landmark: place?.landmark ?? "",
    description: place?.description ?? "",
    location: place ? { point: place.location, district: place.district } : null,
    osm: candidate?.osm ?? null,
    start: candidate?.point ?? null,
    facilities,
    photos: [],
    updatedAt: now,
  };
}

/** Kunci pesan galat di `Laporkan.errors` (messages/id.json). */
export type ErrorKey = "namaKosong" | "kategoriKosong" | "lokasiKosong" | "lokasiMirip" | "terlaluPanjang" | "fotoTerlaluBanyak" | "tagKosong";

export type FieldError = { field: string; message: ErrorKey; values?: Record<string, string | number> };

/** Langkah 1 (FR-21, FR-22). Laporan kekurangan memakai nama, kategori, dan titik lokasi saat ini. */
export function checkInfo(draft: ReportDraft): FieldError[] {
  if (draft.kind === "kekurangan") return [];
  const errors: FieldError[] = [];
  const name = draft.name.trim();
  if (!name) errors.push({ field: "nama", message: "namaKosong" });
  else if (name.length > LIMITS.name) errors.push({ field: "nama", message: "terlaluPanjang", values: { max: LIMITS.name } });
  if (!CATEGORIES.includes(draft.category as Category)) errors.push({ field: "kategori", message: "kategoriKosong" });
  if (!draft.location) errors.push({ field: "lokasi", message: "lokasiKosong" });
  if (draft.landmark.trim().length > LIMITS.landmark) errors.push({ field: "patokan", message: "terlaluPanjang", values: { max: LIMITS.landmark } });
  return errors;
}

/** Langkah 2 (FR-24): jawaban selalu ada (bawaan Belum tahu); hanya catatan yang bisa terlalu panjang. */
export function checkFacilities(draft: ReportDraft): FieldError[] {
  return FACILITIES.filter((f) => draft.facilities[f].note.trim().length > LIMITS.note).map((f) => ({
    field: `catatan-${f}`,
    message: "terlaluPanjang",
    values: { max: LIMITS.note },
  }));
}

/** Langkah 3 (FR-25): paling banyak 10 foto, setiap foto bertag, keterangan dan deskripsi tidak terlalu panjang. */
export function checkPhotos(draft: ReportDraft): FieldError[] {
  const errors: FieldError[] = [];
  if (draft.photos.length > LIMITS.photos) errors.push({ field: "foto", message: "fotoTerlaluBanyak", values: { max: LIMITS.photos } });
  draft.photos.forEach((photo, index) => {
    if (!photo.tag) errors.push({ field: `tag-${photo.key}`, message: "tagKosong", values: { number: index + 1 } });
    if (photo.caption.trim().length > LIMITS.caption) errors.push({ field: `keterangan-${photo.key}`, message: "terlaluPanjang", values: { max: LIMITS.caption } });
  });
  if (draft.description.trim().length > LIMITS.description) errors.push({ field: "deskripsi", message: "terlaluPanjang", values: { max: LIMITS.description } });
  return errors;
}

export const checkStep = (step: Step, draft: ReportDraft) =>
  step === "1" ? checkInfo(draft) : step === "2" ? checkFacilities(draft) : step === "3" ? checkPhotos(draft) : [...checkInfo(draft), ...checkFacilities(draft), ...checkPhotos(draft)];

/** Langkah pertama yang belum lengkap, untuk ringkasan yang dibuka dari tautan atau setelah masuk. */
export function firstIncompleteStep(draft: ReportDraft): Step | null {
  for (const step of ["1", "2", "3"] as const) if (checkStep(step, draft).length) return step;
  return null;
}

const FACILITY_TAG: Record<Facility, PhotoTag> = { ramp: "pintu_masuk", toilet_difabel: "toilet_difabel", guiding_block: "guiding_block", lift: "lift" };

/**
 * Foto yang membantu verifikasi (Panduan Verifikasi 5.1): pintu masuk, lalu satu untuk setiap fasilitas yang dijawab
 * Tersedia atau Tidak perlu. `done` benar bila sudah ada foto dengan tag itu.
 */
export function suggestedPhotos(draft: ReportDraft): { tag: PhotoTag; done: boolean }[] {
  const tags: PhotoTag[] = ["pintu_masuk"];
  for (const facility of FACILITIES) {
    const tag = FACILITY_TAG[facility];
    if (["tersedia", "tidak_perlu"].includes(draft.facilities[facility].answer) && !tags.includes(tag)) tags.push(tag);
  }
  return tags.map((tag) => ({ tag, done: draft.photos.some((photo) => photo.tag === tag) }));
}

const optional = (value: string) => value.trim() || undefined;

/** Isi `POST /reports`. Foto harus sudah diunggah (`uploadedId`). */
export function toPayload(draft: ReportDraft): ReportPayload {
  const facilities = FACILITIES.map((facility) => {
    const { answer, reason, note } = draft.facilities[facility];
    return { facility, answer, reason: answer === "tidak_tersedia" ? (reason ?? undefined) : undefined, note: optional(note) };
  });
  const photos = draft.photos.map((photo) => {
    if (!photo.uploadedId || !photo.tag) throw new Error("foto belum diunggah atau belum bertag");
    return { id: photo.uploadedId, tag: photo.tag, caption: optional(photo.caption) };
  });
  const direct = draft.publishDirectly ? { publishDirectly: true as const, publishReason: (draft.publishReason ?? "").trim() } : {};
  const common = { submissionKey: draft.submissionKey, kind: draft.kind, facilities, photos, description: optional(draft.description), ...direct };
  if (draft.kind === "kekurangan") return { ...common, placeId: draft.placeId! };
  return {
    ...common,
    placeId: draft.placeId ?? undefined,
    name: draft.name.trim(),
    category: draft.category as Category,
    location: draft.location!.point,
    landmark: optional(draft.landmark),
  };
}
