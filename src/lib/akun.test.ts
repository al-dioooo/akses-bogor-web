// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getMe, requestCode, deleteAccount } from "./akun";
import { ApiError } from "./api";

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

describe("account API client", () => {
  it("sends the session token as a bearer header", async () => {
    respond(Response.json({ id: "1", email: "sari@contoh.id" }));
    await getMe("token-tes");
    expect(calls[0]!.url).toBe("http://api.tiruan/me");
    expect(new Headers(calls[0]!.init.headers).get("authorization")).toBe("Bearer token-tes");
  });

  it("answers null when the session is no longer valid", async () => {
    respond(Response.json({ galat: "belum_masuk", pesan: "Sesi berakhir." }, { status: 401 }));
    expect(await getMe("token-lama")).toBeNull();
  });

  it("keeps the API message and the retry-after seconds", async () => {
    respond(Response.json({ galat: "kode_terlalu_sering", pesan: "Tunggu 42 detik." }, { status: 429, headers: { "retry-after": "42" } }));
    const error = await requestCode("sari@contoh.id").catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 429, galat: "kode_terlalu_sering", message: "Tunggu 42 detik.", retryAfterSeconds: 42 });
    expect(JSON.parse(String(calls[0]!.init.body))).toEqual({ email: "sari@contoh.id" });
  });

  it("accepts an empty 204 answer", async () => {
    respond(new Response(null, { status: 204 }));
    await expect(deleteAccount("token-tes")).resolves.toBeUndefined();
    expect(calls[0]!.init.method).toBe("DELETE");
  });

  it("reports an unreachable API in Indonesian", async () => {
    vi.stubGlobal("fetch", async () => {
      throw new TypeError("fetch failed");
    });
    await expect(getMe("token-tes")).rejects.toMatchObject({ galat: "api_tidak_terhubung" });
  });
});
