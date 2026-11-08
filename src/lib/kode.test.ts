import { describe, expect, it } from "vitest";
import { normalizeCode } from "./kode";

describe("normalizeCode", () => {
  it("accepts a pasted code with spaces, dashes, or full-width digits", () => {
    expect(normalizeCode(" 482 915 ")).toBe("482915");
    expect(normalizeCode("482-915")).toBe("482915");
    expect(normalizeCode("４８２９１５")).toBe("482915");
  });
});
