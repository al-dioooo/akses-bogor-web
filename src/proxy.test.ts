// @vitest-environment node
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { placeExists } from "@/lib/api";
import { config, proxy } from "./proxy";

vi.mock("@/lib/api", () => ({ placeExists: vi.fn() }));
const exists = vi.mocked(placeExists);

const request = (path: string, headers: Record<string, string> = {}) =>
  new NextRequest(new URL(path, "https://akses.contoh"), { headers });

describe("proxy", () => {
  beforeEach(() => exists.mockReset());

  it("only runs for the place page, not its share image", () => {
    expect(config.matcher).toBe("/lokasi/:id");
  });

  it("lets a published place render as usual", async () => {
    exists.mockResolvedValue("ada");
    const response = await proxy(request("/lokasi/4037ba19", { "cf-connecting-ip": "198.51.100.7" }));
    expect(response.headers.get("x-middleware-next")).toBe("1");
    expect(response.headers.get("x-middleware-rewrite")).toBeNull();
    expect(exists).toHaveBeenCalledWith("4037ba19", expect.any(Headers));
    expect(exists.mock.calls[0][1].get("cf-connecting-ip")).toBe("198.51.100.7");
  });

  it("shows the prerendered 404 page for a missing place or an invalid id, keeping the address", async () => {
    exists.mockResolvedValue("tidak_ada");
    const response = await proxy(request("/lokasi/bukan-id"));
    expect(response.headers.get("x-middleware-rewrite")).toBe("https://akses.contoh/lokasi/tidak-ada");
    expect(response.status).toBe(404);
  });

  it("answers 503 with a page of its own when the api fails", async () => {
    exists.mockResolvedValue("galat");
    const response = await proxy(request("/lokasi/4037ba19"));
    expect(response.status).toBe(503);
    expect(response.headers.get("content-type")).toBe("text/html; charset=utf-8");
    expect(response.headers.get("retry-after")).toBe("60");
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.text()).toContain('href="/lokasi/4037ba19"');
  });

  it("leaves in-app navigation alone and keeps the 404 page itself at 404, without asking the api", async () => {
    const navigation = await proxy(request("/lokasi/4037ba19", { rsc: "1" }));
    expect(navigation.headers.get("x-middleware-next")).toBe("1");
    expect(navigation.status).toBe(200);
    const notFound = await proxy(request("/lokasi/tidak-ada"));
    expect(notFound.headers.get("x-middleware-next")).toBe("1");
    expect(notFound.status).toBe(404);
    expect(exists).not.toHaveBeenCalled();
  });

  it("treats an address that cannot be decoded as a missing place without asking the api", async () => {
    const response = await proxy(request("/lokasi/%E0%A4%A"));
    expect(response.headers.get("x-middleware-rewrite")).toBe("https://akses.contoh/lokasi/tidak-ada");
    expect(response.status).toBe(404);
    expect(exists).not.toHaveBeenCalled();
  });
});
