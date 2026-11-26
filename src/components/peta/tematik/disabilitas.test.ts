import { describe, expect, it } from "vitest";
import type { DisabilityCounts } from "@/lib/api";
import { RAMP, classOf, classRanges, classWidth, countsFor } from "./disabilitas";

const data: DisabilityCounts = {
  years: [2023, 2024],
  categories: ["fisik", "netra", "mental", "lainnya"],
  districts: [
    { slug: "a", name: "A", counts: [{ year: 2024, category: "fisik", count: 10 }, { year: 2024, category: "netra", count: 5 }, { year: 2023, category: "fisik", count: 99 }] },
    { slug: "b", name: "B", counts: [] },
  ],
  caveat: "",
  source: { title: "", url: "https://example.org", publisher: "", retrievedAt: "2026-11-22T00:00:00.000Z", terms: "" },
};

describe("countsFor", () => {
  it("adds every jenis for Semua jenis, or picks one, for one year, with 0 for kecamatan without numbers", () => {
    expect(countsFor(data, { category: "semua", year: 2024 })).toEqual([
      { slug: "a", name: "A", count: 15 },
      { slug: "b", name: "B", count: 0 },
    ]);
    expect(countsFor(data, { category: "netra", year: 2024 }).map((d) => d.count)).toEqual([5, 0]);
    expect(countsFor(data, { category: "fisik", year: 2023 }).map((d) => d.count)).toEqual([99, 0]);
  });
});

describe("classes", () => {
  it("splits 0 to the largest number into four equal classes with round edges", () => {
    expect(classWidth(1240)).toBe(400);
    expect(classRanges(400)).toEqual([
      { from: 0, to: 399 },
      { from: 400, to: 799 },
      { from: 800, to: 1199 },
      { from: 1200, to: 1599 },
    ]);
    expect(classWidth(99)).toBe(25);
    expect(classWidth(100)).toBe(30);
    expect(classWidth(5105)).toBe(1500);
    expect(classWidth(7)).toBe(2);
    expect(classWidth(0)).toBe(1);
  });

  it("puts the largest number in the darkest class and 0 in the lightest", () => {
    for (const max of [4, 7, 13, 99, 100, 1240, 5105, 98_765]) {
      const width = classWidth(max);
      expect(classOf(max, width), String(max)).toBe(RAMP.length - 1);
      expect(classOf(0, width)).toBe(0);
      expect(classRanges(width, max).at(-1)!.to).toBeGreaterThanOrEqual(max);
    }
  });
});
