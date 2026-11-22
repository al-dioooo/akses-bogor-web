import { describe, expect, it } from "vitest";
import { candidateReportHref, knownWheelchair, osmUrl } from "./kandidat";

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
