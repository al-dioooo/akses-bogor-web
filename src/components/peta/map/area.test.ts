import { describe, expect, it } from "vitest";
import { NO_INSETS, cameraPadding, visibleRect } from "./area";

describe("visibleRect", () => {
  it("returns the whole canvas without insets", () => {
    expect(visibleRect(400, 800, NO_INSETS)).toEqual({ left: 0, top: 0, right: 400, bottom: 800 });
  });

  it("leaves out the parts covered by panels", () => {
    expect(visibleRect(400, 800, { top: 120, right: 0, bottom: 300, left: 0 })).toEqual({ left: 0, top: 120, right: 400, bottom: 500 });
    expect(visibleRect(1280, 700, { top: 0, right: 0, bottom: 0, left: 420 })).toEqual({ left: 420, top: 0, right: 1280, bottom: 700 });
  });

  it("returns null when a panel covers the whole map", () => {
    expect(visibleRect(400, 800, { top: 0, right: 0, bottom: 800, left: 0 })).toBeNull();
    expect(visibleRect(400, 800, { top: 500, right: 0, bottom: 400, left: 0 })).toBeNull();
  });

  it("ignores negative insets", () => {
    expect(visibleRect(400, 800, { top: -10, right: -5, bottom: 0, left: 0 })).toEqual({ left: 0, top: 0, right: 400, bottom: 800 });
  });
});

describe("cameraPadding", () => {
  it("adds a margin to every inset", () => {
    expect(cameraPadding(400, 800, { top: 120, right: 0, bottom: 300, left: 0 })).toEqual({ top: 136, right: 16, bottom: 316, left: 16 });
  });

  it("falls back to the margin when too little of the map is left", () => {
    expect(cameraPadding(400, 800, { top: 400, right: 0, bottom: 350, left: 0 })).toEqual({ top: 16, right: 16, bottom: 16, left: 16 });
  });
});
