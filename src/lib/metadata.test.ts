import { afterEach, describe, expect, it, vi } from "vitest";
import { publicMetadata } from "./metadata";

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

