import { describe, expect, it } from "vitest";
import { areaFromDrag, areaFromKey, clampArea, centeredArea } from "./blur-areas";

describe("blur areas (ADR-0037)", () => {
  it("keeps areas inside the photo", () => {
    expect(clampArea({ x: 0.9, y: -0.1, w: 0.3, h: 0.2 })).toEqual({ x: 0.7, y: 0, w: 0.3, h: 0.2 });
    expect(clampArea({ x: 0.5, y: 0.5, w: 0, h: 2 })).toEqual({ x: 0.5, y: 0, w: 0.02, h: 1 });
  });

  it("turns a drag in any direction into an area and ignores tiny drags", () => {
    expect(areaFromDrag({ x: 0.6, y: 0.5 }, { x: 0.2, y: 0.1 })).toEqual({ x: 0.2, y: 0.1, w: 0.4, h: 0.4 });
    expect(areaFromDrag({ x: 0.5, y: 0.5 }, { x: 0.51, y: 0.6 })).toBeNull();
  });

  it("moves with the arrow keys and resizes with Shift", () => {
    const area = centeredArea();
    expect(areaFromKey(area, "ArrowRight", false)).toEqual({ x: 0.42, y: 0.4, w: 0.2, h: 0.2 });
    expect(areaFromKey(area, "ArrowDown", true)).toEqual({ x: 0.4, y: 0.4, w: 0.2, h: 0.22 });
    expect(areaFromKey({ x: 0, y: 0, w: 0.2, h: 0.2 }, "ArrowLeft", false)).toEqual({ x: 0, y: 0, w: 0.2, h: 0.2 });
    expect(areaFromKey(area, "Enter", false)).toBeNull();
  });
});
