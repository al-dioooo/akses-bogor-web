import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { placeExists, visitorHeaders, visitorIp } from "./api";

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

describe("visitorHeaders", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("passes the visitor address with the web server secret", () => {
    vi.stubEnv("WEB_SERVER_SECRET", "rahasia");
    expect(visitorHeaders(new Headers({ "cf-connecting-ip": "198.51.100.7" }))).toEqual({
      accept: "application/json",
      "x-web-server-secret": "rahasia",
      "x-visitor-ip": "198.51.100.7",
    });
  });

  it("sends neither without the secret", () => {
    vi.stubEnv("WEB_SERVER_SECRET", "");
    expect(visitorHeaders(new Headers({ "cf-connecting-ip": "198.51.100.7" }))).toEqual({ accept: "application/json" });
  });
});

describe("placeExists", () => {
  beforeEach(() => vi.stubEnv("API_URL", "http://api.contoh"));
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  const answer = (status: number) => vi.fn<typeof fetch>(async () => new Response(null, { status }));

  it("asks the api with HEAD for the encoded id", async () => {
    const fetch = answer(200);
    vi.stubGlobal("fetch", fetch);
    expect(await placeExists("a/b", new Headers())).toBe("ada");
    const [url, init] = fetch.mock.calls[0];
    expect(String(url)).toBe("http://api.contoh/places/a%2Fb");
    expect(init?.method).toBe("HEAD");
  });

  it("treats a missing place and an invalid id the same way", async () => {
    vi.stubGlobal("fetch", answer(404));
    expect(await placeExists("4037ba19", new Headers())).toBe("tidak_ada");
    vi.stubGlobal("fetch", answer(400));
    expect(await placeExists("bukan-id", new Headers())).toBe("tidak_ada");
  });

  it("reports an api error or an unreachable api as an error, never as a missing place", async () => {
    vi.stubGlobal("fetch", answer(500));
    expect(await placeExists("4037ba19", new Headers())).toBe("galat");
    vi.stubGlobal("fetch", answer(429));
    expect(await placeExists("4037ba19", new Headers())).toBe("galat");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("fetch failed")));
    expect(await placeExists("4037ba19", new Headers())).toBe("galat");
  });
});
