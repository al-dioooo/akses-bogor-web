import { describe, expect, it } from "vitest";
import { isAccessibleRoute, profileFrom } from "./rute-aksesibel";

describe("profileFrom", () => {
  it("keeps a missing profile apart from a wrong one", () => {
    expect(profileFrom({ profil: "kursi_roda" })).toBe("kursi_roda");
    expect(profileFrom({ profil: "jalan_kaki" })).toBe("jalan_kaki");
    expect(profileFrom({})).toBeUndefined();
    expect(profileFrom(null)).toBeUndefined();
    expect(profileFrom({ profil: "sepeda" })).toBeNull();
    expect(profileFrom({ profil: null })).toBeNull();
  });
});

describe("isAccessibleRoute", () => {
  it("tells an OpenStreetMap route from a Mapbox route", () => {
    const base = { destination: { placeId: null, osm: null, name: null, location: { lat: 0, lng: 0 } }, distanceMeters: 1, durationSeconds: 1, steps: [], geometry: { type: "LineString" as const, coordinates: [] }, polyline: "", attribution: "" };
    expect(isAccessibleRoute({ ...base, warning: "Rute ini rute jalan kaki dari Mapbox." })).toBe(false);
    expect(
      isAccessibleRoute({ ...base, profil: "kursi_roda", coverage: { sidewalkPercent: null, surfacePercent: null, crossings: null, crossingsWithKerb: null, dataDate: null }, warnings: [], note: "" }),
    ).toBe(true);
  });
});
