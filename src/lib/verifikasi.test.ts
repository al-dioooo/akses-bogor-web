// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "./api";
import { fetchReviewPhoto, getReview, moderatePhoto, publishReport } from "./verifikasi";

const calls: { url: string; init: RequestInit }[] = [];
const respond = (response: () => Response) =>
  vi.stubGlobal("fetch", async (url: string | URL, init: RequestInit) => {
    calls.push({ url: String(url), init });
    return response();
  });

beforeEach(() => {
  process.env.API_URL = "http://api.tiruan";
  calls.length = 0;
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("verifier API client", () => {
  it("returns null for unknown reports but keeps other errors", async () => {
    respond(() => Response.json({ galat: "laporan_tidak_ditemukan", pesan: "Tidak ada." }, { status: 404 }));
    expect(await getReview("token", "abc")).toBeNull();
    respond(() => Response.json({ galat: "laporan_sendiri", pesan: "Laporan Anda sendiri." }, { status: 403 }));
    await expect(getReview("token", "abc")).rejects.toMatchObject({ status: 403, galat: "laporan_sendiri" } satisfies Partial<ApiError>);
  });

  it("sends decisions and moderation as JSON with the session token", async () => {
    respond(() => Response.json({ status: "diterbitkan", placeId: "p1" }));
    await publishReport("token-tes", "r1", { description: null, facilities: [] });
    expect(calls[0]!.url).toBe("http://api.tiruan/verifier/reports/r1/publish");
    expect(new Headers(calls[0]!.init.headers).get("authorization")).toBe("Bearer token-tes");
    await moderatePhoto("token-tes", "r1", "f1", { blur: [{ x: 0, y: 0, w: 0.5, h: 0.5 }] });
    expect(calls[1]).toMatchObject({ url: "http://api.tiruan/verifier/reports/r1/photos/f1", init: { method: "PATCH" } });
    expect(JSON.parse(String(calls[1]!.init.body))).toEqual({ blur: [{ x: 0, y: 0, w: 0.5, h: 0.5 }] });
  });

  it("asks for the blurred preview of a photo", async () => {
    respond(() => new Response(new Uint8Array([1, 2, 3]), { headers: { "content-type": "image/webp" } }));
    const response = await fetchReviewPhoto("token-tes", "f1", "kabur");
    expect(calls[0]!.url).toBe("http://api.tiruan/verifier/photos/f1?versi=kabur");
    expect(new Headers(calls[0]!.init.headers).get("authorization")).toBe("Bearer token-tes");
    expect(new Uint8Array(await response!.arrayBuffer())).toEqual(new Uint8Array([1, 2, 3]));
  });
});
