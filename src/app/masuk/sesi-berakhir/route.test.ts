// @vitest-environment node
import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";
import { clearSession } from "@/lib/sesi";
import { GET } from "./route";

vi.mock("@/lib/sesi", () => ({ clearSession: vi.fn() }));

// Alamat seperti yang diterima server di Evergarden dari Cloudflare Tunnel (ADR-0048).
const BEHIND_TUNNEL = "https://127.0.0.1:8091/masuk/sesi-berakhir";

describe("GET /masuk/sesi-berakhir", () => {
  it("clears the session and sends the user to Masuk on the same site with a relative address", async () => {
    const response = await GET(new NextRequest(`${BEHIND_TUNNEL}?kembali=%2Flaporkan%3Flangkah%3Dringkasan`));
    expect(clearSession).toHaveBeenCalled();
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("/masuk?sesi=berakhir&kembali=%2Flaporkan%3Flangkah%3Dringkasan");
  });

  it("drops a return address that leaves the site", async () => {
    const response = await GET(new NextRequest(`${BEHIND_TUNNEL}?kembali=https%3A%2F%2Fcontoh.jahat%2F`));
    expect(response.headers.get("location")).toBe("/masuk?sesi=berakhir");
  });
});
