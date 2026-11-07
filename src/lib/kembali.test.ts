import { describe, expect, it } from "vitest";
import { safeReturnPath, withReturn } from "./kembali";

describe("safeReturnPath", () => {
  it("keeps paths on this site, with their query", () => {
    expect(safeReturnPath("/laporkan")).toBe("/laporkan");
    expect(safeReturnPath("/lokasi/abc?tab=foto")).toBe("/lokasi/abc?tab=foto");
  });

  it("refuses other sites, odd paths, and the sign-in pages", () => {
    for (const value of ["https://jahat.example", "//jahat.example", "/\\jahat.example", "laporkan", "/a\nb", "/masuk", "/masuk/kode?x=1", 5, null]) {
      expect(safeReturnPath(value)).toBeNull();
    }
  });
});

describe("withReturn", () => {
  it("adds the encoded return path", () => {
    expect(withReturn("/masuk", "/lokasi/a?b=c")).toBe("/masuk?kembali=%2Flokasi%2Fa%3Fb%3Dc");
    expect(withReturn("/masuk", null)).toBe("/masuk");
  });
});
