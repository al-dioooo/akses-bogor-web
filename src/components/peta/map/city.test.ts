import { describe, expect, it } from "vitest";
import { outsideCity, signedArea } from "./city";

const square = (west: number, south: number, east: number, north: number): [number, number][] => [
  [west, south],
  [east, south],
  [east, north],
  [west, north],
  [west, south],
];

describe("outsideCity", () => {
  it("cuts every part of the city out of a box larger than the map", () => {
    const city = square(106.73, -6.68, 106.85, -6.53);
    const island = square(106.9, -6.7, 106.91, -6.69);
    const { coordinates } = outsideCity({ type: "MultiPolygon", coordinates: [[city], [island]] });
    expect(coordinates).toHaveLength(3);
    const [world, ...holes] = coordinates;
    const xs = world!.map((point) => point[0]);
    const ys = world!.map((point) => point[1]);
    expect(Math.min(...xs)).toBeLessThan(106.5);
    expect(Math.max(...xs)).toBeGreaterThan(107.1);
    expect(Math.min(...ys)).toBeLessThan(-6.9);
    expect(Math.max(...ys)).toBeGreaterThan(-6.3);
    expect(holes.map((ring) => ring.length)).toEqual([5, 5]);
  });

  it("winds the holes against the outer ring, whatever the outline's own direction", () => {
    const clockwise = [...square(106.73, -6.68, 106.85, -6.53)].reverse();
    for (const ring of [square(106.73, -6.68, 106.85, -6.53), clockwise]) {
      const [world, hole] = outsideCity({ type: "MultiPolygon", coordinates: [[ring]] }).coordinates;
      expect(Math.sign(signedArea(world!))).toBe(-Math.sign(signedArea(hole!)));
    }
  });

  it("skips parts without a usable ring", () => {
    expect(outsideCity({ type: "MultiPolygon", coordinates: [[], [[[106.8, -6.6]]]] }).coordinates).toHaveLength(1);
  });
});
