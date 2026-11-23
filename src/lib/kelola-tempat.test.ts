import { describe, expect, it } from "vitest";
import { withoutEvidence } from "./kelola-tempat";

describe("withoutEvidence", () => {
  it("lists Tersedia and Tidak perlu answers that have no photo of that facility", () => {
    const facilities = [
      { facility: "ramp", answer: "tersedia" },
      { facility: "toilet_difabel", answer: "tersedia" },
      { facility: "guiding_block", answer: "tidak_tersedia" },
      { facility: "lift", answer: "tidak_perlu" },
    ] as const;
    expect(withoutEvidence([...facilities], ["pintu_masuk", "lainnya"])).toEqual(["toilet_difabel", "lift"]);
    expect(withoutEvidence([...facilities], ["pintu_masuk", "toilet_difabel", "lift"])).toEqual([]);
  });

  it("ignores photos without a tag yet", () => {
    expect(withoutEvidence([{ facility: "ramp", answer: "tersedia" }], [""])).toEqual(["ramp"]);
  });
});
