import { FACILITIES, type Answer, type Facility, type Reason, type Status } from "./api";

// Aturan status "pintu masuk dulu" (ADR-0018), sama dengan `src/domain/status.ts` di akses-bogor-api. Di web hanya
// untuk pratinjau di halaman pemeriksaan; status yang tersimpan selalu dihitung API.

export type StatusInput = { facility: Facility; answer: Answer; reason?: Reason | null };
export type StatusResult = { status: Status; available: number; relevant: number; unknown: number; because: StatusInput[] };

export function computeStatus(input: readonly StatusInput[]): StatusResult {
  const answers = FACILITIES.map((facility) => input.find((a) => a.facility === facility) ?? { facility, answer: "belum_tahu" as const });
  const relevant = answers.filter((a) => a.answer !== "tidak_perlu");
  const unavailable = relevant.filter((a) => a.answer === "tidak_tersedia");
  const unknown = relevant.filter((a) => a.answer === "belum_tahu");
  const ramp = answers[0]!;
  const counts = { available: relevant.filter((a) => a.answer === "tersedia").length, relevant: relevant.length, unknown: unknown.length };
  if (ramp.answer === "tidak_tersedia") return { status: "tidak_aksesibel", ...counts, because: [ramp] };
  if (ramp.answer === "belum_tahu" || (relevant.length > 0 && unknown.length * 2 >= relevant.length)) {
    return { status: "belum_diketahui", ...counts, because: unknown };
  }
  if (unavailable.length === 0 && unknown.length === 0) return { status: "aksesibel", ...counts, because: [] };
  return { status: "sebagian", ...counts, because: [...unavailable, ...unknown] };
}
