// @vitest-environment node
import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { fromOtherSite } from "./laporan-proxy";

const SITE = "https://akses-bogor.aldio.dev";
const PRODUCTION = { NODE_ENV: "production", SITE_URL: SITE };
// Di Evergarden, web berjalan di 127.0.0.1:8091 di balik Cloudflare Tunnel (ADR-0048). Next.js menulis alamat itu
// sebagai localhost, dan `x-forwarded-proto: https` membuatnya https.
const behindTunnel = (headers: Record<string, string>) =>
  new NextRequest("https://localhost:8091/laporkan/kirim", {
    method: "POST",
    headers: { host: "akses-bogor.aldio.dev", "x-forwarded-host": "akses-bogor.aldio.dev", "x-forwarded-proto": "https", ...headers },
  });

afterEach(() => {
  vi.restoreAllMocks();
});

describe("fromOtherSite behind the cloudflare tunnel", () => {
  it("accepts posts from the public site named in SITE_URL", () => {
    expect(fromOtherSite(behindTunnel({ origin: SITE, "sec-fetch-site": "same-origin" }), PRODUCTION)).toBe(false);
    expect(fromOtherSite(behindTunnel({ origin: SITE }), { NODE_ENV: "production", SITE_URL: `${SITE}/beranda/` })).toBe(false);
  });

  it("falls back to the referer when the origin header is missing", () => {
    expect(fromOtherSite(behindTunnel({ referer: `${SITE}/laporkan?langkah=ringkasan` }), PRODUCTION)).toBe(false);
    expect(fromOtherSite(behindTunnel({ referer: "https://jahat.example/laporkan" }), PRODUCTION)).toBe(true);
    expect(fromOtherSite(behindTunnel({ referer: "bukan alamat" }), PRODUCTION)).toBe(true);
  });

  it("refuses other origins, including look-alikes and another scheme", () => {
    for (const origin of ["https://jahat.example", `${SITE}.jahat.example`, "http://akses-bogor.aldio.dev", "https://aldio.dev", "null"]) {
      expect(fromOtherSite(behindTunnel({ origin }), PRODUCTION), origin).toBe(true);
    }
  });

  it("does not trust the host or forwarded host headers", () => {
    const forged = behindTunnel({ origin: "https://jahat.example", host: "jahat.example", "x-forwarded-host": "jahat.example" });
    expect(fromOtherSite(forged, PRODUCTION)).toBe(true);
  });

  it("refuses requests the browser marks as coming from another site", () => {
    expect(fromOtherSite(behindTunnel({ origin: SITE, "sec-fetch-site": "same-site" }), PRODUCTION)).toBe(true);
    expect(fromOtherSite(behindTunnel({ "sec-fetch-site": "cross-site" }), PRODUCTION)).toBe(true);
  });

  it("lets requests without origin or referer through, since they do not come from a browser page", () => {
    expect(fromOtherSite(behindTunnel({}), PRODUCTION)).toBe(false);
  });
});

describe("fromOtherSite on a local server", () => {
  const local = (headers: Record<string, string>) => new NextRequest("http://localhost:3000/laporkan/kirim", { method: "POST", headers });

  it("accepts the server's own origin during development and next to SITE_URL", () => {
    expect(fromOtherSite(local({ origin: "http://localhost:3000" }), { NODE_ENV: "development" })).toBe(false);
    expect(fromOtherSite(local({ origin: "http://localhost:3000" }), PRODUCTION)).toBe(false);
    expect(fromOtherSite(local({ origin: SITE }), { NODE_ENV: "development" })).toBe(true);
  });

  it("refuses every origin on a production server without SITE_URL and says why in the log, once", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    delete (globalThis as Record<symbol, unknown>)[Symbol.for("aksesbogor.laporanProxy.siteUrlKosong")];
    expect(fromOtherSite(local({ origin: "http://localhost:3000" }), { NODE_ENV: "production" })).toBe(true);
    expect(fromOtherSite(behindTunnel({ origin: SITE }), { NODE_ENV: "production" })).toBe(true);
    expect(error).toHaveBeenCalledOnce();
    expect(error.mock.calls[0][0]).toMatch(/SITE_URL kosong/);
  });
});
