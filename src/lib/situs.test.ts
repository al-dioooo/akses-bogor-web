import { describe, expect, it, vi } from "vitest";
import { absoluteUrl, configuredSiteUrl, isIndexable, NOINDEX, publicRobots, siteUrl } from "./situs";

describe("siteUrl", () => {
  it("uses SITE_URL and keeps only its origin", () => {
    expect(siteUrl({ SITE_URL: " https://akses-bogor.aldio.dev/beranda/ " }).href).toBe("https://akses-bogor.aldio.dev/");
  });

  it("rejects a SITE_URL that is not an http address", () => {
    expect(() => siteUrl({ SITE_URL: "akses-bogor.aldio.dev" })).toThrow(/SITE_URL/);
    expect(() => siteUrl({ SITE_URL: "ftp://akses-bogor.aldio.dev" })).toThrow(/SITE_URL/);
  });

  it("falls back to localhost:3000 without SITE_URL, whatever port the server runs on", () => {
    expect(siteUrl({}).href).toBe("http://localhost:3000/");
    expect(siteUrl({ PORT: "3300" }).href).toBe("http://localhost:3000/");
  });

  it("warns once per process when a production server has no SITE_URL, but not during the build", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    siteUrl({ NODE_ENV: "development" });
    siteUrl({ NODE_ENV: "production", NEXT_PHASE: "phase-production-build" });
    siteUrl({ NODE_ENV: "production", SITE_URL: "https://contoh.id" });
    expect(warn).not.toHaveBeenCalled();

    siteUrl({ NODE_ENV: "production" });
    siteUrl({ NODE_ENV: "production" });
    expect(warn).toHaveBeenCalledOnce();
    expect(warn.mock.calls[0][0]).toMatch(/SITE_URL kosong/);
    warn.mockRestore();
  });

  it("ignores the deployment addresses Vercel used to set", () => {
    const env = { VERCEL_ENV: "production", VERCEL_PROJECT_PRODUCTION_URL: "akses-bogor.aldio.dev", VERCEL_URL: "x.vercel.app" };
    expect(siteUrl(env).href).toBe("http://localhost:3000/");
  });
});

describe("configuredSiteUrl", () => {
  it("returns only the origin of SITE_URL, and null without a fallback when it is empty", () => {
    expect(configuredSiteUrl({ SITE_URL: " https://akses-bogor.aldio.dev/beranda/ " })?.origin).toBe("https://akses-bogor.aldio.dev");
    expect(configuredSiteUrl({})).toBeNull();
    expect(configuredSiteUrl({ SITE_URL: "  " })).toBeNull();
  });

  it("rejects a SITE_URL that is not an http address", () => {
    expect(() => configuredSiteUrl({ SITE_URL: "akses-bogor.aldio.dev" })).toThrow(/SITE_URL/);
  });
});

describe("absoluteUrl", () => {
  it("joins a path to the site address", () => {
    expect(absoluteUrl("/lokasi/abc", { SITE_URL: "https://contoh.id" })).toBe("https://contoh.id/lokasi/abc");
  });
});

describe("isIndexable", () => {
  it("is off by default", () => {
    expect(isIndexable({})).toBe(false);
    expect(isIndexable({ SITE_URL: "https://contoh.id" })).toBe(false);
  });

  it("is on only with SITE_INDEXABLE=true and a SITE_URL", () => {
    expect(isIndexable({ SITE_INDEXABLE: "true", SITE_URL: "https://contoh.id" })).toBe(true);
    expect(isIndexable({ SITE_INDEXABLE: " TRUE ", SITE_URL: "https://contoh.id" })).toBe(true);
  });

  it("stays off without a SITE_URL so the fallback address is never indexed", () => {
    expect(isIndexable({ SITE_INDEXABLE: "true" })).toBe(false);
  });

  it("stays off for values other than true", () => {
    for (const value of ["1", "yes", "false", ""]) {
      expect(isIndexable({ SITE_INDEXABLE: value, SITE_URL: "https://contoh.id" })).toBe(false);
    }
  });
});

describe("publicRobots", () => {
  it("lets public pages be indexed only when the switch is on", () => {
    expect(publicRobots({})).toEqual(NOINDEX);
    expect(publicRobots({ SITE_INDEXABLE: "true", SITE_URL: "https://contoh.id" })).toEqual({ index: true, follow: true });
  });
});
