import { describe, expect, it } from "vitest";
import type { MyReport } from "./akun";
import { countByStatus, deskSummary, firstName, openClarifications } from "./dasbor";
import type { QueueItem } from "./verifikasi";

const report = (id: string, values: Partial<MyReport> = {}): MyReport => ({
  id,
  kind: "baru",
  status: "menunggu",
  placeId: null,
  placeName: `Tempat ${id}`,
  submittedAt: "2026-11-02T03:00:00.000Z",
  decidedAt: null,
  rejectionReason: null,
  clarificationQuestion: null,
  clarificationDueAt: null,
  ...values,
});

const item = (id: string, values: Partial<QueueItem> = {}): QueueItem => ({
  id,
  kind: "baru",
  status: "menunggu",
  placeId: null,
  name: `Laporan ${id}`,
  category: "halte",
  district: { slug: "bogor-tengah", name: "Bogor Tengah" },
  reporterName: "Sari",
  photos: 1,
  submittedAt: "2026-11-20T03:00:00.000Z",
  answered: false,
  clarificationDueAt: null,
  worsens: false,
  ...values,
});

// Senin 23 November 2026, 10.00 WIB.
const now = new Date("2026-11-23T03:00:00.000Z");

describe("countByStatus", () => {
  it("counts every status, including the ones with no reports", () => {
    const counts = countByStatus([report("a"), report("b", { status: "diterbitkan" }), report("c", { status: "diterbitkan" })]);
    expect(counts).toEqual({ menunggu: 1, klarifikasi: 0, diterbitkan: 2, ditolak: 0 });
  });
});

describe("openClarifications", () => {
  it("keeps open questions only, nearest deadline first, with the days left in WIB", () => {
    const open = openClarifications(
      [
        report("later", { status: "klarifikasi", clarificationDueAt: "2026-11-28T03:00:00.000Z" }),
        report("past", { status: "klarifikasi", clarificationDueAt: "2026-11-22T03:00:00.000Z" }),
        report("tonight", { status: "klarifikasi", clarificationDueAt: "2026-11-23T15:00:00.000Z" }),
        report("waiting", { clarificationDueAt: "2026-11-28T03:00:00.000Z" }),
      ],
      now,
    );
    expect(open.map((entry) => [entry.report.id, entry.daysLeft])).toEqual([
      ["tonight", 0],
      ["later", 5],
    ]);
  });
});

describe("deskSummary", () => {
  it("finds the oldest report, the ones past the three working day target, and the answered ones", () => {
    const queue = {
      total: 120,
      items: [item("new"), item("old", { submittedAt: "2026-11-13T03:00:00.000Z" }), item("answered", { submittedAt: "2026-11-17T03:00:00.000Z", answered: true })],
    };
    const waiting = { total: 2, items: [item("w1", { clarificationDueAt: "2026-11-27T03:00:00.000Z" }), item("w2", { clarificationDueAt: "2026-11-25T03:00:00.000Z" })] };
    const recheck = { total: 1, items: [{ id: "p", name: "Halte", category: "halte" as const, district: { slug: "bogor-tengah", name: "Bogor Tengah" }, status: "aksesibel" as const, lastVerifiedAt: "2025-09-01T00:00:00.000Z" }] };
    expect(deskSummary(queue, waiting, recheck, now)).toEqual({
      queue: { total: 120, oldest: { id: "old", name: "Laporan old", workingDays: 6 }, overdue: 2, answered: 1, own: 0 },
      waiting: { total: 2, nextDueAt: "2026-11-25T03:00:00.000Z", own: 0 },
      recheck: { total: 1, oldestVerifiedAt: "2025-09-01T00:00:00.000Z" },
    });
  });

  it("reports an empty desk without an oldest report", () => {
    const empty = { total: 0, items: [] };
    expect(deskSummary(empty, empty, empty, now)).toEqual({
      queue: { total: 0, oldest: null, overdue: 0, answered: 0, own: 0 },
      waiting: { total: 0, nextDueAt: null, own: 0 },
      recheck: { total: 0, oldestVerifiedAt: null },
    });
  });

  it("counts the verifier's own waiting reports, which the queue leaves out (FR-37)", () => {
    const empty = { total: 0, items: [] };
    const desk = deskSummary({ total: 0, ownWaiting: 1, items: [] }, { total: 0, ownWaiting: 2, items: [] }, empty, now);
    expect(desk.queue).toMatchObject({ total: 0, oldest: null, own: 1 });
    expect(desk.waiting).toMatchObject({ total: 0, own: 2 });
  });
});

describe("firstName", () => {
  it("greets with the first word of the display name", () => {
    expect(firstName("  Sari Lestari ")).toBe("Sari");
  });
});
