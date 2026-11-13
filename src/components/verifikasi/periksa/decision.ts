import { FACILITIES, type Answer, type Category, type Facility, type Reason } from "@/lib/api";
import type { ConfirmedLocation } from "@/lib/isian-laporan";
import type { Evidence, FacilityValue, PublishInput, Review } from "@/lib/verifikasi";

// Keputusan verifikator di halaman pemeriksaan (FR-33, ADR-0036): nilai akhir yang akan tayang, dimulai dari isian
// pelapor. Setiap jawaban harus ditandai Terbukti atau Tanpa bukti sebelum terbit.

export const DECISION_LIMITS = { name: 120, landmark: 140, note: 200, description: 1000, reviewerNote: 1000 } as const;

export type FacilityDecision = { answer: Answer; reason: Reason | null; note: string; evidence: Evidence | null };

export type Decision = {
  name: string;
  category: Category;
  landmark: string;
  description: string;
  location: ConfirmedLocation;
  facilities: Record<Facility, FacilityDecision>;
  /** Catatan internal untuk verifikator lain (ADR-0036). */
  note: string;
};

export function initialDecision(review: Review): Decision {
  const s = review.submission;
  return {
    name: s.name,
    category: s.category,
    landmark: s.landmark ?? "",
    description: s.description ?? "",
    location: { point: s.location, district: s.district },
    facilities: Object.fromEntries(
      s.facilities.map((f) => [f.facility, { answer: f.answer, reason: f.reason, note: f.note ?? "", evidence: null }]),
    ) as Record<Facility, FacilityDecision>,
    note: review.reviewerNote ?? "",
  };
}

/** Jawaban yang tayang: Tanpa bukti menjadi Belum tahu (ADR-0019). */
export function finalAnswer(facility: Facility, decision: FacilityDecision): FacilityValue {
  const note = decision.note.trim() || null;
  if (decision.evidence === "tanpa_bukti") return { facility, answer: "belum_tahu", reason: null, note };
  return { facility, answer: decision.answer, reason: decision.answer === "tidak_tersedia" ? decision.reason : null, note };
}

export type Problem = { key: "unchecked" | "reason" | "note" | "name" | "landmark" | "description"; facility?: Facility; target: string };

/** Hal yang mencegah terbit, dengan id kolom tujuan fokus. Kosong berarti siap diterbitkan. */
export function decisionProblems(review: Review, decision: Decision): Problem[] {
  const problems: Problem[] = [];
  if (review.kind !== "kekurangan") {
    const name = decision.name.trim();
    if (!name || name.length > DECISION_LIMITS.name) problems.push({ key: "name", target: "keputusan-nama" });
    if (decision.landmark.trim().length > DECISION_LIMITS.landmark) problems.push({ key: "landmark", target: "keputusan-patokan" });
  }
  for (const facility of FACILITIES) {
    const value = decision.facilities[facility];
    if (!value.evidence) problems.push({ key: "unchecked", facility, target: `bukti-${facility}-terbukti` });
    else if (value.evidence === "terbukti" && value.answer === "tidak_tersedia" && !value.reason) problems.push({ key: "reason", facility, target: `alasan-${facility}-tidak_ada` });
    if (value.note.trim().length > DECISION_LIMITS.note) problems.push({ key: "note", facility, target: `catatan-${facility}` });
  }
  if (decision.description.trim().length > DECISION_LIMITS.description) problems.push({ key: "description", target: "keputusan-deskripsi" });
  return problems;
}

/** Isi `POST /verifier/reports/{id}/publish`. Kekurangan tidak mengirim nama, kategori, titik, dan patokan. */
export function publishInput(review: Review, decision: Decision): PublishInput {
  const place =
    review.kind === "kekurangan"
      ? {}
      : { name: decision.name.trim(), category: decision.category, location: decision.location.point, landmark: decision.landmark.trim() || null };
  return {
    ...(review.place ? { placeVersion: review.place.version } : {}),
    ...place,
    description: decision.description.trim() || null,
    facilities: FACILITIES.map((facility) => ({ ...finalAnswer(facility, decision.facilities[facility]), evidence: decision.facilities[facility].evidence ?? "tanpa_bukti" })),
    ...(decision.note.trim() ? { note: decision.note.trim() } : {}),
  };
}
