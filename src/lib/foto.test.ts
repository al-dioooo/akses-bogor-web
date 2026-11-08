// @vitest-environment node
import { describe, expect, it } from "vitest";
import { checkFile, fitWithin, MAX_RAW_BYTES } from "./foto";

describe("fitWithin", () => {
  it("shrinks the longest side to 2048 px and never enlarges", () => {
    expect(fitWithin(4032, 3024)).toEqual({ width: 2048, height: 1536 });
    expect(fitWithin(3000, 6000)).toEqual({ width: 1024, height: 2048 });
    expect(fitWithin(800, 600)).toEqual({ width: 800, height: 600 });
  });
});

describe("checkFile", () => {
  it("accepts JPEG, PNG, WebP, and HEIC up to 20 MB raw (ADR-0023)", () => {
    for (const type of ["image/jpeg", "image/png", "image/webp", "image/heic"]) expect(checkFile({ type, size: 5_000_000 })).toBeNull();
    expect(checkFile({ type: "image/gif", size: 1000 })).toBe("jenis");
    expect(checkFile({ type: "application/pdf", size: 1000 })).toBe("jenis");
    expect(checkFile({ type: "image/jpeg", size: MAX_RAW_BYTES + 1 })).toBe("terlaluBesar");
  });
});
