import { describe, expect, it } from "vitest";
import { visitorIp } from "./api";

describe("visitorIp", () => {
  it("uses the address Cloudflare writes, not the forwarded-for value the client sent", () => {
    const headers = new Headers({ "cf-connecting-ip": "198.51.100.7", "x-forwarded-for": "203.0.113.9, 198.51.100.7" });
    expect(visitorIp(headers)).toBe("198.51.100.7");
  });

  it("falls back to the first forwarded-for entry without Cloudflare", () => {
    expect(visitorIp(new Headers({ "x-forwarded-for": " 198.51.100.8 , 10.0.0.1" }))).toBe("198.51.100.8");
  });

  it("returns nothing without either header", () => {
    expect(visitorIp(new Headers())).toBeUndefined();
    expect(visitorIp(new Headers({ "cf-connecting-ip": " ", "x-forwarded-for": "" }))).toBeUndefined();
  });
});
