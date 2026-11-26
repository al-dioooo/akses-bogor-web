import { describe, expect, it } from "vitest";
import type { DistrictAccessibility } from "@/lib/api";
import { SCORE_RANGES, cityTotals, ranked, scoreClass, unverified } from "./aksesibel";

const district = (slug: string, rank: number | null, withData: number, aksesbogor: number, google = 0): DistrictAccessibility["districts"][number] => ({
  slug,
  name: slug.toUpperCase(),
  places: withData + 10,
  withData,
  accessible: Math.floor(withData / 2),
  limited: 0,
  notAccessible: withData - Math.floor(withData / 2),
  score: rank === null ? null : 50,
  rank,
  bySource: { aksesbogor: { withData: aksesbogor, accessible: 0 }, openstreetmap: { withData: withData - aksesbogor - google, accessible: 0 }, google_maps: { withData: google, accessible: 0 } },
});

const data = {
  minimumPlaces: 5,
  formula: "",
  caveat: "",
  districts: [district("c", null, 2, 1), district("b", 2, 6, 0, 2), district("a", null, 0, 0), district("d", 1, 9, 3)],
  sources: { aksesbogor: { checkedByTeam: true }, openstreetmap: { checkedByTeam: false, attribution: "", url: "", retrievedAt: null }, google_maps: null },
} satisfies DistrictAccessibility;

describe("accessible kecamatan", () => {
  it("colours the score in the four ADR-0053 classes", () => {
    expect([0, 24, 25, 49, 50, 74, 75, 100].map(scoreClass)).toEqual([0, 0, 1, 1, 2, 2, 3, 3]);
    expect(SCORE_RANGES).toEqual([
      { from: 0, to: 24 },
      { from: 25, to: 49 },
      { from: 50, to: 74 },
      { from: 75, to: 100 },
    ]);
  });

  it("counts what is not checked by the team, per kecamatan and for the city", () => {
    expect(unverified(data.districts[1]!)).toBe(6);
    expect(cityTotals(data)).toEqual({ places: 57, withData: 17, unverified: 13, openstreetmap: 11, google: 2 });
  });

  it("lists ranked kecamatan by rank, then those without enough data by name", () => {
    const { withRank, without } = ranked(data);
    expect(withRank.map((d) => d.slug)).toEqual(["d", "b"]);
    expect(without.map((d) => d.slug)).toEqual(["a", "c"]);
  });
});
