// @vitest-environment node
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "./api";
import { checkLocation, sendReport, uploadPhoto } from "./laporan";
import { apiFailure, fromOtherSite, readJson } from "./laporan-proxy";

const calls: { url: string; init: RequestInit }[] = [];
const respond = (response: Response) =>
  vi.stubGlobal("fetch", async (url: string | URL, init: RequestInit) => {
    calls.push({ url: String(url), init });
    return response;
  });

beforeEach(() => {
  process.env.API_URL = "http://api.tiruan";
  calls.length = 0;
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("report API client", () => {
  it("posts the location check as JSON without a session", async () => {
    respond(Response.json({ district: { slug: "bogor-tengah", name: "Bogor Tengah" }, nearby: [] }));
    await checkLocation({ location: { lat: -6.59, lng: 106.79 }, name: "Halte" });
    expect(calls[0]!.url).toBe("http://api.tiruan/reports/location-check");
    const headers = new Headers(calls[0]!.init.headers);
    expect(headers.get("content-type")).toBe("application/json");
    expect(headers.get("authorization")).toBeNull();
    expect(JSON.parse(String(calls[0]!.init.body))).toEqual({ location: { lat: -6.59, lng: 106.79 }, name: "Halte" });
  });

  it("sends a photo as raw bytes with the session token", async () => {
    respond(Response.json({ id: "f1", width: 10, height: 10, bytes: 3 }, { status: 201 }));
    const bytes = new Uint8Array([0xff, 0xd8, 0xff]).buffer;
    await uploadPhoto("token-tes", bytes, "image/jpeg");
    const headers = new Headers(calls[0]!.init.headers);
    expect(headers.get("content-type")).toBe("image/jpeg");
    expect(headers.get("authorization")).toBe("Bearer token-tes");
    expect(calls[0]!.init.body).toBe(bytes);
  });

  it("keeps the API error code and message", async () => {
    respond(Response.json({ galat: "di_luar_kota_bogor", pesan: "Titik ini berada di luar Kota Bogor." }, { status: 422 }));
    const error = await sendReport("token-tes", { submissionKey: "k", kind: "baru", facilities: [], photos: [] }).catch((e: unknown) => e);
    expect(error).toMatchObject({ status: 422, galat: "di_luar_kota_bogor", message: "Titik ini berada di luar Kota Bogor." });
  });

  it("reports an unreachable API", async () => {
    vi.stubGlobal("fetch", async () => Promise.reject(new TypeError("fetch failed")));
    expect(await checkLocation({ location: { lat: 0, lng: 0 } }).catch((e: unknown) => e)).toMatchObject({ status: 0, galat: "api_tidak_terhubung" });
  });
});

describe("report proxy helpers", () => {
  const post = (headers: Record<string, string>) => new NextRequest("https://aksesbogor.id/laporkan/kirim", { method: "POST", headers });

  it("accepts requests from the same site and refuses others", () => {
    expect(fromOtherSite(post({ origin: "https://aksesbogor.id", "sec-fetch-site": "same-origin" }))).toBe(false);
    expect(fromOtherSite(post({}))).toBe(false);
    expect(fromOtherSite(post({ origin: "https://jahat.example" }))).toBe(true);
    expect(fromOtherSite(post({ "sec-fetch-site": "cross-site" }))).toBe(true);
  });

  it("reads JSON up to a size limit", async () => {
    const body = (text: string) => new Request("https://aksesbogor.id/x", { method: "POST", body: text });
    expect(await readJson(body('{"a":1}'), 100)).toEqual({ a: 1 });
    expect(await readJson(body("bukan json"), 100)).toBeNull();
    expect(await readJson(body(JSON.stringify({ a: "x".repeat(200) })), 100)).toBeNull();
  });

  it("forwards API errors with their status and retry-after", async () => {
    const res = apiFailure(new ApiError(429, "laporan_terlalu_sering", "Coba lagi besok.", 3600));
    expect(res.status).toBe(429);
    expect(res.headers.get("retry-after")).toBe("3600");
    expect(await res.json()).toEqual({ galat: "laporan_terlalu_sering", pesan: "Coba lagi besok." });
    expect(apiFailure(new ApiError(0, "api_tidak_terhubung", "Tidak terhubung.")).status).toBe(502);
  });
});
