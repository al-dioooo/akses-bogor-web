import { describe, expect, it } from "vitest";
import type { Answer } from "./api";
import { computeStatus } from "./status";

const of = (ramp: Answer, toilet: Answer, guiding: Answer, lift: Answer) =>
  computeStatus([
    { facility: "ramp", answer: ramp },
    { facility: "toilet_difabel", answer: toilet },
    { facility: "guiding_block", answer: guiding },
    { facility: "lift", answer: lift },
  ]);

// Kasus yang sama dengan test/status.test.ts di akses-bogor-api.
describe("computeStatus (ADR-0018)", () => {
  it("makes the place inaccessible when the entrance is not usable", () => {
    expect(of("tidak_tersedia", "tersedia", "tersedia", "tersedia")).toMatchObject({ status: "tidak_aksesibel", available: 3, relevant: 4 });
  });

  it("is unknown when the entrance or half of the relevant facilities are unknown", () => {
    expect(of("belum_tahu", "tersedia", "tersedia", "tersedia").status).toBe("belum_diketahui");
    expect(of("tersedia", "belum_tahu", "tersedia", "tidak_perlu")).toMatchObject({ status: "sebagian", relevant: 3, unknown: 1 });
    expect(of("tersedia", "belum_tahu", "belum_tahu", "tersedia").status).toBe("belum_diketahui");
  });

  it("is accessible only when every relevant facility is available", () => {
    expect(of("tidak_perlu", "tidak_perlu", "tidak_perlu", "tidak_perlu")).toMatchObject({ status: "aksesibel", relevant: 0 });
    expect(of("tersedia", "tidak_perlu", "tersedia", "tidak_perlu")).toMatchObject({ status: "aksesibel", available: 2, relevant: 2 });
    expect(of("tersedia", "tidak_tersedia", "tersedia", "tidak_perlu").because).toEqual([{ facility: "toilet_difabel", answer: "tidak_tersedia" }]);
  });
});
