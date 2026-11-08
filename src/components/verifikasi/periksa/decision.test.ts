import { describe, expect, it } from "vitest";
import { sampleReview } from "@/test/review";
import { decisionProblems, initialDecision, publishInput, type Decision } from "./decision";

const checkAll = (decision: Decision): Decision => ({
  ...decision,
  facilities: Object.fromEntries(Object.entries(decision.facilities).map(([facility, value]) => [facility, { ...value, evidence: "terbukti" }])) as Decision["facilities"],
});

describe("review decision (FR-33)", () => {
  it("starts from the reporter's answers with nothing checked", () => {
    const review = sampleReview();
    const decision = initialDecision(review);
    expect(decision.facilities.toilet_difabel).toEqual({ answer: "tersedia", reason: null, note: "Kunci di pos satpam", evidence: null });
    expect(decisionProblems(review, decision).map((p) => p.key)).toEqual(["unchecked", "unchecked", "unchecked", "unchecked"]);
  });

  it("needs a reason for every proven Tidak tersedia and turns answers without evidence into Belum tahu", () => {
    const review = sampleReview();
    const decision = checkAll(initialDecision(review));
    decision.facilities.ramp = { ...decision.facilities.ramp, answer: "tidak_tersedia" };
    expect(decisionProblems(review, decision)).toEqual([{ key: "reason", facility: "ramp", target: "alasan-ramp-tidak_ada" }]);
    decision.facilities.ramp = { ...decision.facilities.ramp, evidence: "tanpa_bukti" };
    expect(decisionProblems(review, decision)).toEqual([]);
    const input = publishInput(review, decision);
    expect(input.facilities[0]).toEqual({ facility: "ramp", answer: "belum_tahu", reason: null, note: null, evidence: "tanpa_bukti" });
    expect(input).toMatchObject({ name: "Masjid Jami contoh", category: "masjid", location: { lat: -6.5976, lng: 106.7991 }, landmark: "Dekat pasar" });
    expect(input).not.toHaveProperty("placeVersion");
  });

  it("sends the place version and leaves the place fields out for Laporkan kekurangan", () => {
    const review = sampleReview({
      kind: "kekurangan",
      place: { ...sampleReview().submission, id: "p1", version: "2026-10-18T03:00:00.000Z", lastVerifiedAt: "2026-10-18T03:00:00.000Z", photos: [] },
    });
    const decision = { ...checkAll(initialDecision(review)), name: "", note: "  Lift dicek lewat telepon  " };
    expect(decisionProblems(review, decision)).toEqual([]);
    const input = publishInput(review, decision);
    expect(input).toMatchObject({ placeVersion: "2026-10-18T03:00:00.000Z", description: "Ramp di pintu utama.", note: "Lift dicek lewat telepon" });
    expect(input).not.toHaveProperty("name");
    expect(input).not.toHaveProperty("location");
  });
});
