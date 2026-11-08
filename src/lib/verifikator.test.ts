import { describe, expect, it } from "vitest";
import { daysWaiting, workingDaysWaiting } from "./verifikator";

describe("waiting time", () => {
  it("counts calendar days in WIB", () => {
    // 23.30 WIB Senin sampai 00.30 WIB Selasa sudah berganti hari di Bogor.
    expect(daysWaiting("2026-11-09T16:30:00.000Z", new Date("2026-11-09T17:30:00.000Z"))).toBe(1);
    expect(daysWaiting("2026-11-09T03:00:00.000Z", new Date("2026-11-09T09:00:00.000Z"))).toBe(0);
  });

  it("skips Saturday and Sunday for the three working day target", () => {
    // Jumat 6 November sampai Rabu 11 November 2026: Senin, Selasa, Rabu.
    expect(workingDaysWaiting("2026-11-06T03:00:00.000Z", new Date("2026-11-11T03:00:00.000Z"))).toBe(3);
    expect(workingDaysWaiting("2026-11-07T03:00:00.000Z", new Date("2026-11-08T03:00:00.000Z"))).toBe(0);
  });
});
