import { createFormatter, createTranslator } from "next-intl";
import { afterEach, describe, expect, it, vi } from "vitest";
import messages from "../../messages/id.json";
import type { PlaceDetail } from "./api";
import { placeMetadata, publicMetadata } from "./metadata";

vi.mock("next-intl/server", () => ({
  getTranslations: async (namespace: string) => createTranslator({ locale: "id", messages, namespace: namespace as "Detail" }),
  getFormatter: async () => createFormatter({ locale: "id", timeZone: "Asia/Jakarta" }),
}));

const PLACE: PlaceDetail = {
  id: "4037ba19",
  name: "Halte contoh",
  category: "halte",
  district: { slug: "bogor-tengah", name: "Bogor Tengah" },
  status: "sebagian",
  summary: { available: 2, relevant: 3, unknown: 0 },
  location: { lat: -6.5958, lng: 106.7942 },
  lastVerifiedAt: "2026-11-03T03:00:00.000Z",
  landmark: null,
  description: null,
  facilities: [],
  because: [],
  photos: [],
  needsRecheck: false,
};

const PAGE = { title: "Jelajahi Lokasi", description: "Cari tempat di Kota Bogor.", path: "/jelajahi", siteName: "AksesBogor" };

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("publicMetadata", () => {
  it("gives the page its own description, canonical address and share cards", () => {
    expect(publicMetadata(PAGE)).toMatchObject({
      title: "Jelajahi Lokasi",
      description: "Cari tempat di Kota Bogor.",
      alternates: { canonical: "/jelajahi" },
      openGraph: { type: "website", locale: "id_ID", siteName: "AksesBogor", url: "/jelajahi", title: "Jelajahi Lokasi" },
      twitter: { card: "summary_large_image", title: "Jelajahi Lokasi", description: "Cari tempat di Kota Bogor." },
    });
  });

  it("keeps the home page title free of the site name template", () => {
    expect(publicMetadata({ ...PAGE, title: "AksesBogor: peta aksesibilitas", absoluteTitle: true, path: "/" }).title).toEqual({
      absolute: "AksesBogor: peta aksesibilitas",
    });
  });

  it("is noindex while the indexing switch is off", () => {
    vi.stubEnv("SITE_URL", "https://contoh.id");
    expect(publicMetadata(PAGE).robots).toEqual({ index: false, follow: false });
  });

  it("can be indexed once the switch is on", () => {
    vi.stubEnv("SITE_URL", "https://contoh.id");
    vi.stubEnv("SITE_INDEXABLE", "true");
    expect(publicMetadata(PAGE).robots).toEqual({ index: true, follow: true });
  });
});

describe("placeMetadata", () => {
  it("describes the place with its verified status in words", async () => {
    const metadata = await placeMetadata(PLACE);
    expect(metadata.title).toBe("Halte contoh, Bogor Tengah");
    expect(metadata.description).toBe(
      "Halte di Kecamatan Bogor Tengah, Kota Bogor. Status aksesibilitas: Sebagian. 2 dari 3 fasilitas tersedia. Terakhir diverifikasi 3 November 2026.",
    );
    expect(metadata.alternates).toEqual({ canonical: "/lokasi/4037ba19" });
    expect(metadata.openGraph).toMatchObject({ url: "/lokasi/4037ba19", title: "Halte contoh, Bogor Tengah" });
  });

  it("says how many facilities are still unknown and when the data needs a recheck", async () => {
    const metadata = await placeMetadata({ ...PLACE, status: "belum_diketahui", summary: { available: 1, relevant: 3, unknown: 2 }, needsRecheck: true });
    expect(metadata.description).toContain("Status aksesibilitas: Belum diketahui. 1 dari 3 fasilitas tersedia, 2 belum diketahui.");
    expect(metadata.description).toMatch(/Data ini perlu dicek ulang\.$/);
  });
});
