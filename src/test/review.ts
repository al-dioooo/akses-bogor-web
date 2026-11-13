import type { Review } from "@/lib/verifikasi";

/** Laporan contoh untuk tes komponen pemeriksaan, sama bentuknya dengan `GET /verifier/reports/{id}`. */
export function sampleReview(overrides: Partial<Review> = {}): Review {
  return {
    id: "10000000-0000-4000-8000-000000000001",
    kind: "baru",
    status: "menunggu",
    submittedAt: "2026-11-01T02:00:00.000Z",
    decidedAt: null,
    rejectionReason: null,
    reporterName: "Sari",
    reviewerNote: null,
    submission: {
      name: "Masjid Jami contoh",
      category: "masjid",
      location: { lat: -6.5976, lng: 106.7991 },
      district: { slug: "bogor-tengah", name: "Bogor Tengah" },
      landmark: "Dekat pasar",
      description: "Ramp di pintu utama.",
      facilities: [
        { facility: "ramp", answer: "tersedia", reason: null, note: null },
        { facility: "toilet_difabel", answer: "tersedia", reason: null, note: "Kunci di pos satpam" },
        { facility: "guiding_block", answer: "belum_tahu", reason: null, note: null },
        { facility: "lift", answer: "tidak_perlu", reason: null, note: null },
      ],
      status: { status: "aksesibel", available: 2, relevant: 3, unknown: 1 },
    },
    photos: [],
    clarifications: [],
    place: null,
    nearby: [],
    ...overrides,
  };
}
