import { describe, expect, it } from "vitest";
import { absoluteUrl, isIndexable, NOINDEX, publicRobots, siteUrl } from "./situs";

describe("siteUrl", () => {
  it("uses SITE_URL and keeps only its origin", () => {
    expect(siteUrl({ SITE_URL: " https://akses-bogor.aldio.dev/beranda/ " }).href).toBe("https://akses-bogor.aldio.dev/");
  });

  it("rejects a SITE_URL that is not an http address", () => {
    expect(() => siteUrl({ SITE_URL: "akses-bogor.aldio.dev" })).toThrow(/SITE_URL/);
    expect(() => siteUrl({ SITE_URL: "ftp://akses-bogor.aldio.dev" })).toThrow(/SITE_URL/);
  });

  it("falls back to the Vercel production domain on production deploys", () => {
    const env = { VERCEL_ENV: "production", VERCEL_PROJECT_PRODUCTION_URL: "akses-bogor.aldio.dev", VERCEL_URL: "x-123.vercel.app" };
    expect(siteUrl(env).href).toBe("https://akses-bogor.aldio.dev/");
  });

  it("falls back to the branch or deploy address on preview deploys", () => {
    expect(siteUrl({ VERCEL_ENV: "preview", VERCEL_BRANCH_URL: "cabang.vercel.app", VERCEL_URL: "x.vercel.app" }).href).toBe(
      "https://cabang.vercel.app/",
    );
    expect(siteUrl({ VERCEL_ENV: "preview", VERCEL_URL: "x.vercel.app" }).href).toBe("https://x.vercel.app/");
  });

  it("falls back to localhost:3000 outside Vercel, whatever port the server runs on", () => {
    expect(siteUrl({}).href).toBe("http://localhost:3000/");
    expect(siteUrl({ PORT: "3300" }).href).toBe("http://localhost:3000/");
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

  it("stays off without a SITE_URL so fallback addresses are never indexed", () => {
    expect(isIndexable({ SITE_INDEXABLE: "true", VERCEL_ENV: "production", VERCEL_PROJECT_PRODUCTION_URL: "a.vercel.app" })).toBe(false);
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
