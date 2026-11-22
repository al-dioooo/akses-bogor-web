import { describe, expect, it } from "vitest";
import type { PlaceDetail } from "./api";
import { placeJsonLd, serializeJsonLd, siteJsonLd } from "./json-ld";

// Properti yang boleh dipakai per tipe, termasuk warisan dari tipe induknya di schema.org (Thing, CreativeWork,
// Place, PropertyValue). `query-input` adalah anotasi SearchAction yang dibaca Google.
const ALLOWED: Record<string, string[]> = {
  WebSite: ["@id", "url", "name", "description", "inLanguage", "publisher", "potentialAction"],
  Organization: ["@id", "name", "url", "areaServed"],
  SearchAction: ["target", "query-input"],
  EntryPoint: ["urlTemplate"],
  Place: ["@id", "name", "url", "description", "address", "containedInPlace", "geo", "amenityFeature"],
  AdministrativeArea: ["name", "containedInPlace"],
  City: ["name"],
  PostalAddress: ["addressLocality", "addressRegion", "addressCountry"],
  GeoCoordinates: ["latitude", "longitude"],
  LocationFeatureSpecification: ["name", "value"],
};

/** Setiap objek bertipe hanya memakai properti yang dikenal untuk tipenya; objek tanpa tipe hanya rujukan `@id`. */
function expectValidShape(node: unknown, path = "$"): void {
  if (Array.isArray(node)) return node.forEach((item, index) => expectValidShape(item, `${path}[${index}]`));
  if (!node || typeof node !== "object") return;
  const { "@type": type, "@graph": graph, ...props } = node as Record<string, unknown>;
  delete props["@context"];
  if (graph) return expectValidShape(graph, `${path}.@graph`);
  if (type === undefined) {
    expect(Object.keys(props), `${path} tanpa @type`).toEqual(["@id"]);
    return;
  }
  expect(ALLOWED, `${path} bertipe ${String(type)}`).toHaveProperty(String(type));
  for (const key of Object.keys(props)) expect(ALLOWED[String(type)], `${path}.${key}`).toContain(key);
  for (const [key, value] of Object.entries(props)) expectValidShape(value, `${path}.${key}`);
}

const PLACE: PlaceDetail = {
  id: "4037ba19",
  name: "Halte contoh",
  category: "halte",
  district: { slug: "bogor-tengah", name: "Bogor Tengah" },
  status: "sebagian",
  summary: { available: 1, relevant: 3, unknown: 1 },
  location: { lat: -6.5958, lng: 106.7942 },
  lastVerifiedAt: "2026-11-03T03:00:00.000Z",
  landmark: null,
  description: null,
  facilities: [
    { facility: "ramp", answer: "tersedia", reason: null, note: null },
    { facility: "toilet_difabel", answer: "tidak_perlu", reason: null, note: null },
    { facility: "guiding_block", answer: "tidak_tersedia", reason: "rusak", note: null },
    { facility: "lift", answer: "belum_tahu", reason: null, note: null },
  ],
  because: [],
  photos: [],
  needsRecheck: false,
};

const LABELS = {
  url: "https://contoh.id/lokasi/4037ba19",
  description: "Halte di Kecamatan Bogor Tengah, Kota Bogor.",
  facility: (key: string) => ({ ramp: "Ramp / Jalur Landai", guiding_block: "Guiding Block" })[key] ?? key,
};

describe("siteJsonLd", () => {
  const data = siteJsonLd({ url: "https://contoh.id/", name: "AksesBogor", description: "Info aksesibilitas." });

  it("describes the site, its publisher and a search that opens Jelajahi", () => {
    expect(data["@context"]).toBe("https://schema.org");
    const [site, organization] = data["@graph"];
    expect(site).toMatchObject({ "@type": "WebSite", url: "https://contoh.id/", name: "AksesBogor", inLanguage: "id-ID" });
    expect(site.potentialAction?.target.urlTemplate).toBe("https://contoh.id/jelajahi?q={search_term_string}");
    expect(site.publisher).toEqual({ "@id": organization["@id"] });
    expect(organization).toMatchObject({ "@type": "Organization", name: "AksesBogor", areaServed: { "@type": "City", name: "Kota Bogor" } });
  });

  it("only uses schema.org properties that fit each type", () => {
    expectValidShape(data);
  });
});

describe("placeJsonLd", () => {
  const data = placeJsonLd(PLACE, LABELS);

  it("describes the place with its district and coordinates", () => {
    expect(data).toMatchObject({
      "@context": "https://schema.org",
      "@type": "Place",
      name: "Halte contoh",
      url: "https://contoh.id/lokasi/4037ba19",
      containedInPlace: { "@type": "AdministrativeArea", name: "Kecamatan Bogor Tengah" },
      geo: { "@type": "GeoCoordinates", latitude: -6.5958, longitude: 106.7942 },
    });
  });

  it("lists only facilities with a definite verified answer", () => {
    expect(data.amenityFeature).toEqual([
      { "@type": "LocationFeatureSpecification", name: "Ramp / Jalur Landai", value: true },
      { "@type": "LocationFeatureSpecification", name: "Guiding Block", value: false },
    ]);
  });

  it("leaves facilities out when no answer is definite", () => {
    const unknown = placeJsonLd({ ...PLACE, facilities: [{ facility: "lift", answer: "belum_tahu", reason: null, note: null }] }, LABELS);
    expect(unknown).not.toHaveProperty("amenityFeature");
  });

  it("only uses schema.org properties that fit each type", () => {
    expectValidShape(data);
  });
});

describe("serializeJsonLd", () => {
  it("keeps text from the data from closing the script tag", () => {
    const html = serializeJsonLd(placeJsonLd({ ...PLACE, name: "</script><script>alert(1)</script>" }, LABELS));
    expect(html).not.toContain("</script>");
    expect(JSON.parse(html).name).toBe("</script><script>alert(1)</script>");
  });
});
