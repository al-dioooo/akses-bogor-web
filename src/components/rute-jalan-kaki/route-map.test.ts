import { describe, expect, it } from "vitest";
import { pointAlong } from "./route-map";

// Garis kira-kira 111 m ke timur lalu 111 m ke selatan di sekitar Kota Bogor.
const line: [number, number][] = [
  [106.79, -6.59],
  [106.791, -6.59],
  [106.791, -6.591],
];

describe("pointAlong", () => {
  it("finds the point at a distance along the route", () => {
    const [lng, lat] = pointAlong(line, 55);
    expect(lat).toBeCloseTo(-6.59, 6);
    expect(lng).toBeCloseTo(106.7905, 3);
    const [lng2, lat2] = pointAlong(line, 166);
    expect(lng2).toBeCloseTo(106.791, 6);
    expect(lat2).toBeCloseTo(-6.5905, 3);
  });

  it("stops at the start and the end of the route", () => {
    expect(pointAlong(line, 0)).toEqual([106.79, -6.59]);
    expect(pointAlong(line, 10_000)).toEqual([106.791, -6.591]);
  });
});
