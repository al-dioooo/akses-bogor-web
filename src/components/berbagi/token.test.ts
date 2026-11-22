import { describe, expect, it } from "vitest";
import { tokenColor } from "./token";

describe("tokenColor", () => {
  it("reads a primitive colour", () => {
    expect(tokenColor("violet/600")).toBe("#6440E8");
  });

  it("follows light mode aliases down to the primitive", () => {
    expect(tokenColor("color/brand/fill")).toBe("#6440E8");
    expect(tokenColor("color/status/partial/bg")).toBe(tokenColor("amber/100"));
  });

  it("fails loudly for an unknown token", () => {
    expect(() => tokenColor("color/tidak/ada")).toThrow(/tidak ada/);
  });
});
