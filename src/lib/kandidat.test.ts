import { describe, expect, it } from "vitest";
import { candidateReportHref, knownWheelchair, osmUrl, parseCandidatePrefill } from "./kandidat";

describe("candidateReportHref", () => {
  it("carries the OSM id, name, category, and point to Laporkan", () => {
    const href = candidateReportHref({ osmType: "way", osmId: 42, name: "Masjid & Aula", category: "masjid", lat: -6.5951234567, lng: 106.79 });
    expect(href).toBe("/laporkan?osm=way%2F42&nama=Masjid+%26+Aula&kategori=masjid&lat=-6.595123&lng=106.790000");
  });

  it("leaves the name out when OSM has none", () => {
    expect(candidateReportHref({ osmType: "node", osmId: 7, name: null, category: "halte", lat: -6.6, lng: 106.8 })).toBe(
      "/laporkan?osm=node%2F7&kategori=halte&lat=-6.600000&lng=106.800000",
    );
  });
});

describe("OSM helpers", () => {
  it("knows the common wheelchair values only", () => {
    expect(["yes", "limited", "no", "designated"].every(knownWheelchair)).toBe(true);
    expect(knownWheelchair("bad")).toBe(false);
  });

  it("links to the place on openstreetmap.org", () => {
    expect(osmUrl({ osmType: "relation", osmId: 9 })).toBe("https://www.openstreetmap.org/relation/9");
  });
});

describe("parseCandidatePrefill", () => {
  const params = { osm: "node/9001", nama: " Masjid kandidat A ", kategori: "masjid", lat: "-6.595", lng: "106.79" };

  it("reads the OSM id, name, category, and starting point", () => {
    expect(parseCandidatePrefill(params)).toEqual({ osm: "node/9001", name: "Masjid kandidat A", category: "masjid", point: { lat: -6.595, lng: 106.79 } });
  });

  it("needs a well-formed OSM id", () => {
    for (const osm of [undefined, "", "node/0", "way/-1", "area/1", "node/1/2", ["node/1"]]) expect(parseCandidatePrefill({ ...params, osm })).toBeNull();
  });

  it("drops values that are not usable instead of rejecting the whole prefill", () => {
    expect(parseCandidatePrefill({ osm: "way/2", nama: "x".repeat(121), kategori: "gereja", lat: "-6.2", lng: "106.79" })).toEqual({
      osm: "way/2",
      name: "",
      category: "",
      point: null,
    });
    expect(parseCandidatePrefill({ osm: "way/2", nama: "a\u0000b", lat: "", lng: "106.79" })).toMatchObject({ name: "", point: null });
  });
});
