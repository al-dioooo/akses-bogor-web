// @vitest-environment node
import { describe, expect, it } from "vitest";
import type { PlaceDetail } from "./api";
import { isExpired } from "./draf";
import { checkFacilities, checkInfo, checkPhotos, draftKeyFor, firstIncompleteStep, newDraft, suggestedPhotos, toPayload, type PhotoDraft, type ReportDraft } from "./isian-laporan";

const NOW = Date.UTC(2026, 10, 8);
const uuid = () => "11111111-1111-4111-8111-111111111111";

const halte: PlaceDetail = {
  id: "22222222-2222-4222-8222-222222222222",
  name: "Halte contoh",
  category: "halte",
  district: { slug: "bogor-tengah", name: "Bogor Tengah" },
  status: "sebagian",
  summary: { available: 1, relevant: 2, unknown: 0 },
  location: { lat: -6.5958, lng: 106.7942 },
  lastVerifiedAt: "2026-10-01T00:00:00Z",
  landmark: "Seberang pintu utama",
  description: "Halte di trotoar lebar.",
  facilities: [
    { facility: "ramp", answer: "tersedia", reason: null, note: "Landai" },
    { facility: "toilet_difabel", answer: "tidak_perlu", reason: null, note: null },
    { facility: "guiding_block", answer: "tidak_tersedia", reason: "terhalang", note: null },
    { facility: "lift", answer: "tidak_perlu", reason: null, note: null },
  ],
  because: [],
  photos: [],
  needsRecheck: false,
};

const photo = (extra: Partial<PhotoDraft> = {}): PhotoDraft => ({
  key: "f1",
  blob: new Blob(["x"]),
  name: "pintu.jpg",
  width: 2048,
  height: 1536,
  tag: "pintu_masuk",
  caption: "",
  uploadedId: "33333333-3333-4333-8333-333333333333",
  ...extra,
});

const complete = (extra: Partial<ReportDraft> = {}): ReportDraft => ({
  ...newDraft("baru", null, NOW, uuid),
  name: "Masjid Al-Ikhlas contoh",
  category: "masjid",
  location: { point: { lat: -6.5976, lng: 106.7991 }, district: { slug: "bogor-tengah", name: "Bogor Tengah" } },
  ...extra,
});

describe("newDraft", () => {
  it("starts a new place with every facility at Belum tahu (ADR-0017)", () => {
    const draft = newDraft("baru", null, NOW, uuid);
    expect(draft).toMatchObject({ draftKey: "baru", submissionKey: uuid(), kind: "baru", placeId: null, name: "", category: "", location: null, photos: [], updatedAt: NOW });
    expect(Object.values(draft.facilities).every((f) => f.answer === "belum_tahu" && f.reason === null && f.note === "")).toBe(true);
  });

  it("fills an edit or gap report with the current place data (FR-27)", () => {
    const draft = newDraft("kekurangan", halte, NOW, uuid);
    expect(draft).toMatchObject({
      draftKey: `kekurangan:${halte.id}`,
      kind: "kekurangan",
      placeId: halte.id,
      name: "Halte contoh",
      category: "halte",
      landmark: "Seberang pintu utama",
      description: "Halte di trotoar lebar.",
      location: { point: halte.location, district: halte.district },
    });
    expect(draft.facilities.guiding_block).toEqual({ answer: "tidak_tersedia", reason: "terhalang", note: "" });
    expect(draft.facilities.ramp.note).toBe("Landai");
    expect(draftKeyFor("perubahan", halte.id)).toBe(`perubahan:${halte.id}`);
    expect(draftKeyFor("baru", null)).toBe("baru");
  });
});

describe("step checks", () => {
  it("needs a name, one category, and a confirmed location in step 1", () => {
    const errors = checkInfo(newDraft("baru", null, NOW, uuid));
    expect(errors.map((e) => [e.field, e.message])).toEqual([
      ["nama", "namaKosong"],
      ["kategori", "kategoriKosong"],
      ["lokasi", "lokasiKosong"],
    ]);
    expect(checkInfo(complete())).toEqual([]);
    expect(checkInfo(complete({ name: "x".repeat(121), landmark: "y".repeat(141) })).map((e) => e.field)).toEqual(["nama", "patokan"]);
    // Laporkan kekurangan tidak mengubah nama, kategori, dan titik.
    expect(checkInfo({ ...newDraft("kekurangan", halte, NOW, uuid), name: "" })).toEqual([]);
  });

  it("limits facility notes to 200 characters (ADR-0022)", () => {
    const draft = complete();
    draft.facilities.lift.note = "x".repeat(201);
    expect(checkFacilities(draft)).toEqual([{ field: "catatan-lift", message: "terlaluPanjang", values: { max: 200 } }]);
  });

  it("needs a tag on every photo and at most 10 photos (ADR-0023)", () => {
    expect(checkPhotos(complete({ photos: [photo({ tag: "" })] }))).toEqual([{ field: "tag-f1", message: "tagKosong", values: { number: 1 } }]);
    const eleven = Array.from({ length: 11 }, (_, i) => photo({ key: `f${i}` }));
    expect(checkPhotos(complete({ photos: eleven })).map((e) => e.field)).toEqual(["foto"]);
    expect(checkPhotos(complete({ description: "x".repeat(1001) })).map((e) => e.field)).toEqual(["deskripsi"]);
  });

  it("finds the first step that still needs work", () => {
    expect(firstIncompleteStep(newDraft("baru", null, NOW, uuid))).toBe("1");
    expect(firstIncompleteStep(complete({ photos: [photo({ tag: "" })] }))).toBe("3");
    expect(firstIncompleteStep(complete())).toBeNull();
  });
});

describe("suggestedPhotos", () => {
  it("asks for the entrance and each facility answered Tersedia or Tidak perlu", () => {
    const draft = newDraft("kekurangan", halte, NOW, uuid);
    expect(suggestedPhotos(draft)).toEqual([
      { tag: "pintu_masuk", done: false },
      { tag: "toilet_difabel", done: false },
      { tag: "lift", done: false },
    ]);
    expect(suggestedPhotos({ ...draft, photos: [photo()] })[0]).toEqual({ tag: "pintu_masuk", done: true });
  });
});

describe("toPayload", () => {
  it("sends trimmed text, reasons only for Tidak tersedia, and uploaded photo ids", () => {
    const draft = complete({ landmark: "  ", description: " Ramp di depan. ", photos: [photo({ caption: " Dari jalan " })] });
    draft.facilities.lift = { answer: "tidak_tersedia", reason: "rusak", note: " Mati " };
    draft.facilities.ramp = { answer: "tersedia", reason: "rusak", note: "" };
    expect(toPayload(draft)).toEqual({
      submissionKey: uuid(),
      kind: "baru",
      placeId: undefined,
      name: "Masjid Al-Ikhlas contoh",
      category: "masjid",
      location: { lat: -6.5976, lng: 106.7991 },
      landmark: undefined,
      description: "Ramp di depan.",
      facilities: [
        { facility: "ramp", answer: "tersedia", reason: undefined, note: undefined },
        { facility: "toilet_difabel", answer: "belum_tahu", reason: undefined, note: undefined },
        { facility: "guiding_block", answer: "belum_tahu", reason: undefined, note: undefined },
        { facility: "lift", answer: "tidak_tersedia", reason: "rusak", note: "Mati" },
      ],
      photos: [{ id: "33333333-3333-4333-8333-333333333333", tag: "pintu_masuk", caption: "Dari jalan" }],
    });
  });

  it("sends only the place id for a gap report", () => {
    const payload = toPayload(newDraft("kekurangan", halte, NOW, uuid));
    expect(payload).toMatchObject({ kind: "kekurangan", placeId: halte.id });
    expect(payload).not.toHaveProperty("name");
    expect(payload).not.toHaveProperty("location");
  });

  it("refuses photos that are not uploaded yet", () => {
    expect(() => toPayload(complete({ photos: [photo({ uploadedId: null })] }))).toThrow();
  });
});

describe("isExpired", () => {
  it("drops drafts after 7 days", () => {
    expect(isExpired({ updatedAt: NOW }, NOW + 6 * 86_400_000)).toBe(false);
    expect(isExpired({ updatedAt: NOW }, NOW + 7 * 86_400_000 + 1)).toBe(true);
  });
});
