import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, getMapPlaces, type PlaceMap } from "@/lib/api";
import robots from "./robots";
import sitemap from "./sitemap";

vi.mock("@/lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api")>()),
  getMapPlaces: vi.fn(),
}));

const MAP: PlaceMap = {
  type: "FeatureCollection",
  features: [
    { type: "Feature", id: "a1", geometry: { type: "Point", coordinates: [106.8, -6.6] }, properties: { name: "Halte A", category: "halte", status: "aksesibel" } },
    { type: "Feature", id: "b 2", geometry: { type: "Point", coordinates: [106.7, -6.5] }, properties: { name: "Masjid B", category: "masjid", status: "sebagian" } },
  ],
};

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("robots", () => {
  it("blocks every crawler while the indexing switch is off", () => {
    vi.stubEnv("SITE_URL", "https://contoh.id");
    expect(robots()).toEqual({ rules: { userAgent: "*", disallow: "/" } });
  });

  it("allows crawling and points to the sitemap when the switch is on", () => {
    vi.stubEnv("SITE_URL", "https://contoh.id");
    vi.stubEnv("SITE_INDEXABLE", "true");
    expect(robots()).toEqual({
      rules: { userAgent: "*", allow: "/", disallow: ["/peta/kunci", "/peta/lokasi/"] },
      sitemap: "https://contoh.id/sitemap.xml",
    });
  });
});

describe("sitemap", () => {
  it("lists the public pages and every published place", async () => {
    vi.stubEnv("SITE_URL", "https://contoh.id");
    vi.mocked(getMapPlaces).mockResolvedValue(MAP);
    const urls = (await sitemap()).map((entry) => entry.url);
    expect(urls).toContain("https://contoh.id/");
    expect(urls).toContain("https://contoh.id/jelajahi");
    expect(urls).toContain("https://contoh.id/syarat");
    expect(urls).toContain("https://contoh.id/lokasi/a1");
    expect(urls).toContain("https://contoh.id/lokasi/b%202");
  });

  it("never lists account, sign-in, report or verifier pages", async () => {
    vi.mocked(getMapPlaces).mockResolvedValue(MAP);
    const urls = (await sitemap()).map((entry) => new URL(entry.url).pathname);
    for (const path of urls) expect(path).not.toMatch(/^\/(akun|masuk|laporkan|verifikasi)/);
  });

  it("still lists the public pages when the api cannot be reached", async () => {
    vi.stubEnv("SITE_URL", "https://contoh.id");
    vi.mocked(getMapPlaces).mockRejectedValue(new ApiError(0, "api_tidak_terhubung", "API tidak bisa dihubungi."));
    const urls = (await sitemap()).map((entry) => entry.url);
    expect(urls).toHaveLength(9);
    expect(urls).toContain("https://contoh.id/tentang");
  });
});
