import { describe, expect, it } from "vitest";
import { snapAfterDrag } from "./place-sheet";

// Tinggi lembar untuk kecil, setengah, dan penuh di ponsel 412 × 855 px.
const heights = [170, 470, 855];

describe("snapAfterDrag", () => {
  it("stops at the nearest height after a slow drag", () => {
    expect(snapAfterDrag(heights, 200, 0.1)).toBe("kecil");
    expect(snapAfterDrag(heights, 400, -0.2)).toBe("setengah");
    expect(snapAfterDrag(heights, 700, 0)).toBe("penuh");
  });

  it("moves one step in the direction of a quick flick", () => {
    expect(snapAfterDrag(heights, 230, 1.2)).toBe("setengah");
    expect(snapAfterDrag(heights, 520, 0.9)).toBe("penuh");
    expect(snapAfterDrag(heights, 820, -1)).toBe("setengah");
    expect(snapAfterDrag(heights, 430, -0.8)).toBe("kecil");
  });

  it("stays within the smallest and the largest height", () => {
    expect(snapAfterDrag(heights, 855, 2)).toBe("penuh");
    expect(snapAfterDrag(heights, 170, -2)).toBe("kecil");
  });
});
