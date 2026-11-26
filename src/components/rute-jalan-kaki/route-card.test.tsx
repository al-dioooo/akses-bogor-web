import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { WithIntl } from "@/test/intl";
import { RouteCard, routeTarget } from "./route-card";
import { StartPoint } from "./start-point";

const WARNING = "Rute ini rute jalan kaki dari Mapbox. Rute ini tidak memperhitungkan tangga, trotoar, kerb, atau kemiringan jalan, jadi belum tentu bisa dilewati kursi roda.";
const ROUTE = {
  destination: { placeId: null, osm: { type: "node", id: 9001 }, name: "Masjid Al-Hidayah", location: { lat: -6.5712, lng: 106.7655 } },
  distanceMeters: 1460,
  durationSeconds: 1100,
  steps: [
    { instruction: "Berjalan ke selatan", distanceMeters: 1460, durationSeconds: 1100, name: null, maneuver: "depart", location: { lat: -6.56, lng: 106.76 } },
    { instruction: "Anda tiba di tujuan", distanceMeters: 0, durationSeconds: 0, name: null, maneuver: "arrive", location: { lat: -6.5712, lng: 106.7655 } },
  ],
  geometry: { type: "LineString", coordinates: [[106.76, -6.56], [106.7655, -6.5712]] },
  polyline: "abc",
  warning: WARNING,
  attribution: "© Mapbox © OpenStreetMap",
};
/** API tanpa `ACCESSIBLE_ROUTER_URL`: kartu kembali ke rute Mapbox. */
const OFF = { status: 503, body: { galat: "rute_aksesibel_belum_aktif", pesan: "Rute dari data OpenStreetMap belum diatur di server." } };
const NOTE = "Dihitung dari data OpenStreetMap; kondisi lapangan bisa berbeda.";
const osmRoute = (profil: "kursi_roda" | "jalan_kaki") => ({
  destination: ROUTE.destination,
  profil,
  distanceMeters: profil === "kursi_roda" ? 1620 : 1460,
  durationSeconds: profil === "kursi_roda" ? 1500 : 1100,
  steps: [
    { instruction: "Mulai berjalan ke arah selatan", distanceMeters: 1620, durationSeconds: 1500, name: null, maneuver: "depart", location: { lat: -6.56, lng: 106.76 } },
    { instruction: "Tiba di tujuan", distanceMeters: 0, durationSeconds: 0, name: null, maneuver: "arrive", location: { lat: -6.5712, lng: 106.7655 } },
  ],
  geometry: ROUTE.geometry,
  polyline: profil === "kursi_roda" ? "kursi" : "kaki",
  coverage: { sidewalkPercent: 62, surfacePercent: 18, crossings: 3, crossingsWithKerb: 1, dataDate: "2026-11-25" },
  warnings: [
    ...(profil === "jalan_kaki" ? [{ code: "melewati_tangga", message: "Rute ini melewati tangga sekitar 20 m." }] : []),
    { code: "kerb_tinggi", message: "Ada kerb tinggi yang tercatat di 1 ruas jalur yang dilewati rute ini." },
    { code: "data_trotoar_kurang", message: "Data trotoar belum tercatat di OpenStreetMap untuk 38% panjang rute." },
    ...(profil === "kursi_roda" ? [{ code: "kemiringan_tidak_dihitung", message: "Kemiringan jalan belum ikut dihitung; tanjakan hanya diketahui bila tercatat di OSM." }] : []),
  ],
  note: NOTE,
  attribution: "© kontributor OpenStreetMap (https://www.openstreetmap.org/copyright)",
});
const OBSTACLES = {
  bufferMeters: 20,
  truncated: false,
  features: [{ kind: "tangga", description: "Tangga, 4 anak tangga", name: null, tags: {}, distanceFromRouteMeters: 5, alongRouteMeters: 310, osm: { type: "way", id: 1, url: "https://www.openstreetmap.org/way/1" } }],
  note: "Data OpenStreetMap bisa tidak lengkap atau sudah berubah.",
  attribution: "© kontributor OpenStreetMap",
};

function mockFetch(...replies: { status: number; body: unknown }[]) {
  const fetch = vi.fn(async () => {
    const reply = replies.shift()!;
    return new Response(JSON.stringify(reply.body), { status: reply.status, headers: { "content-type": "application/json" } });
  });
  vi.stubGlobal("fetch", fetch);
  return fetch;
}

function grantLocation(result: { coords?: { latitude: number; longitude: number }; denied?: boolean }) {
  const getCurrentPosition = vi.fn((ok: PositionCallback, fail: PositionErrorCallback) =>
    result.denied ? fail({ code: 1, PERMISSION_DENIED: 1 } as GeolocationPositionError) : ok({ coords: { ...result.coords, accuracy: 8 } } as GeolocationPosition),
  );
  Object.defineProperty(navigator, "geolocation", { value: { getCurrentPosition }, configurable: true });
}

afterEach(() => {
  vi.unstubAllGlobals();
  Reflect.deleteProperty(navigator, "geolocation");
});

describe("routeTarget", () => {
  it("turns a card target into the route body", () => {
    expect(routeTarget({ kind: "aksesbogor", placeId: "p1" })).toEqual({ placeId: "p1" });
    expect(routeTarget({ kind: "osm", osmType: "node", osmId: 9001 })).toEqual({ osm: { type: "node", id: 9001 } });
  });
});

describe("RouteCard", () => {
  it("explains the location first, then shows the route with the fixed warning, steps and obstacles", async () => {
    grantLocation({ coords: { latitude: -6.56, longitude: 106.76 } });
    const fetch = mockFetch(OFF, { status: 200, body: ROUTE }, { status: 200, body: OBSTACLES });
    render(<RouteCard target={{ kind: "osm", osmType: "node", osmId: 9001 }} name="Masjid Al-Hidayah" />, { wrapper: WithIntl });
    expect(screen.getByRole("heading", { name: "Rute jalan kaki ke Masjid Al-Hidayah" })).toBeTruthy();
    expect(screen.getByText(/tidak pernah dikirim ke agen AI/)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Pakai lokasi saya" }));
    await waitFor(() => expect(screen.getByText("1,5 km · sekitar 18 menit jalan kaki")).toBeTruthy());
    // Fokus dipindah efek setelah render, jadi ditunggu juga.
    await waitFor(() => expect(document.activeElement?.textContent).toBe("1,5 km · sekitar 18 menit jalan kaki"));
    expect(screen.getByText(WARNING)).toBeTruthy();
    expect(screen.queryByRole("group", { name: "Profil rute" })).toBeNull();
    expect(screen.queryByText(NOTE)).toBeNull();
    expect(screen.getByRole("region", { name: "Langkah" }).querySelectorAll("li")).toHaveLength(2);
    await waitFor(() => expect(screen.getByText("Tangga, 4 anak tangga")).toBeTruthy());
    expect(screen.getByRole("link", { name: /^Lihat di OpenStreetMap\s*\(Tangga, 4 anak tangga\)$/ }).getAttribute("href")).toBe("https://www.openstreetmap.org/way/1");
    const bodies = (fetch.mock.calls as unknown as [string, RequestInit][]).map(([, init]) => JSON.parse(init.body as string));
    expect(bodies).toEqual([
      { from: { lat: -6.56, lng: 106.76 }, osm: { type: "node", id: 9001 }, profil: "kursi_roda" },
      { from: { lat: -6.56, lng: 106.76 }, osm: { type: "node", id: 9001 } },
      { polyline: "abc" },
    ]);
  });

  it("opens the map picker when the location is denied", async () => {
    grantLocation({ denied: true });
    render(<RouteCard target={{ kind: "aksesbogor", placeId: "4037ba19-b366-45bc-aceb-270944fe9372" }} name={null} />, { wrapper: WithIntl });
    expect(screen.getByRole("heading", { name: "Rute jalan kaki ke fasilitas ini" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Pakai lokasi saya" }));
    expect(screen.getByRole("alert").textContent).toBe("Izin lokasi ditolak. Pilih titik awal di peta.");
    expect(screen.getByRole("heading", { name: "Pilih titik awal di peta" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Pakai titik ini" })).toBeTruthy();
  });

  it("shows the API message and lets the user retry or choose again", async () => {
    grantLocation({ coords: { latitude: -6.2, longitude: 106.82 } });
    mockFetch({ status: 422, body: { galat: "di_luar_kota_bogor", pesan: "Posisi Anda berada di luar Kota Bogor." } });
    render(<RouteCard target={{ kind: "osm", osmType: "node", osmId: 9001 }} name="Masjid Al-Hidayah" />, { wrapper: WithIntl });
    fireEvent.click(screen.getByRole("button", { name: "Pakai lokasi saya" }));
    await waitFor(() => expect(screen.getByRole("alert").textContent).toBe("Posisi Anda berada di luar Kota Bogor."));
    fireEvent.click(screen.getByRole("button", { name: "Ganti titik awal" }));
    expect(screen.getByRole("button", { name: "Pakai lokasi saya" })).toBeTruthy();
  });

  it("loads the route right away from a start point chosen on the page, through the given route handlers", async () => {
    const fetch = mockFetch(OFF, { status: 200, body: ROUTE }, { status: 200, body: OBSTACLES });
    render(
      <RouteCard
        target={{ kind: "aksesbogor", placeId: "4037ba19-b366-45bc-aceb-270944fe9372" }}
        name="Halte contoh"
        from={{ lat: -6.5965, lng: 106.7972 }}
        endpoints={{ route: "/tanya-rute/rute", obstacles: "/tanya-rute/hambatan" }}
      />,
      { wrapper: WithIntl },
    );
    expect(screen.queryByRole("button", { name: "Pakai lokasi saya" })).toBeNull();
    await waitFor(() => expect(screen.getByText(WARNING)).toBeTruthy());
    await waitFor(() => expect(screen.getByText("Tangga, 4 anak tangga")).toBeTruthy());
    const calls = fetch.mock.calls as unknown as [string, RequestInit][];
    expect(calls.map(([url]) => url).slice(-2)).toEqual(["/tanya-rute/rute", "/tanya-rute/hambatan"]);
    expect(JSON.parse(calls.at(-2)![1].body as string)).toEqual({ from: { lat: -6.5965, lng: 106.7972 }, placeId: "4037ba19-b366-45bc-aceb-270944fe9372" });
  });

  it("shows a wheelchair route from OpenStreetMap with the fixed note, coverage and warnings, then switches to walking", async () => {
    const fetch = mockFetch({ status: 200, body: osmRoute("kursi_roda") }, { status: 200, body: OBSTACLES }, { status: 200, body: osmRoute("jalan_kaki") }, { status: 200, body: OBSTACLES });
    render(<RouteCard target={{ kind: "osm", osmType: "node", osmId: 9001 }} name="Masjid Al-Hidayah" from={{ lat: -6.56, lng: 106.76 }} />, { wrapper: WithIntl });
    await waitFor(() => expect(screen.getByText("1,6 km · sekitar 25 menit dengan kursi roda")).toBeTruthy());
    const profiles = screen.getByRole("group", { name: "Profil rute" });
    expect(screen.getByRole("button", { name: "Kursi roda", pressed: true })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Jalan kaki", pressed: false })).toBeTruthy();
    expect(profiles.getAttribute("aria-describedby")).toBeTruthy();
    expect(screen.getByText(NOTE)).toBeTruthy();
    expect(screen.queryByText(WARNING)).toBeNull();
    const coverage = screen.getByRole("region", { name: "Kelengkapan data di rute ini" });
    expect([...coverage.querySelectorAll("li")].map((li) => li.textContent)).toEqual([
      "Trotoar atau jalur pejalan kaki tercatat di 62% panjang rute",
      "Jenis permukaan tercatat di 18% panjang rute",
      "Kerb tercatat di 1 dari 3 penyeberangan",
    ]);
    expect(coverage.textContent).toContain("Data OpenStreetMap per 25 November 2026.");
    const warnings = screen.getByRole("region", { name: "Perlu diperhatikan" });
    expect([...warnings.querySelectorAll("li")].map((li) => li.textContent)).toEqual([
      "Ada kerb tinggi yang tercatat di 1 ruas jalur yang dilewati rute ini.",
      "Kemiringan jalan belum ikut dihitung; tanjakan hanya diketahui bila tercatat di OSM.",
    ]);
    expect(screen.getByText(/Rute dan data jalan:/)).toBeTruthy();
    expect(screen.queryByRole("link", { name: "© Mapbox" })).toBeNull();
    await waitFor(() => expect(screen.getByText("Tangga, 4 anak tangga")).toBeTruthy());

    fireEvent.click(screen.getByRole("button", { name: "Jalan kaki" }));
    await waitFor(() => expect(screen.getByText("1,5 km · sekitar 18 menit jalan kaki")).toBeTruthy());
    expect(screen.getByRole("button", { name: "Jalan kaki", pressed: true })).toBeTruthy();
    expect(screen.getByText("Rute ini melewati tangga sekitar 20 m.")).toBeTruthy();
    const bodies = (fetch.mock.calls as unknown as [string, RequestInit][]).map(([, init]) => JSON.parse(init.body as string));
    expect(bodies.map((body) => body.profil ?? body.polyline)).toEqual(["kursi_roda", "kursi", "jalan_kaki", "kaki"]);
  });

  it("offers the walking route when no wheelchair path is found", async () => {
    mockFetch(
      { status: 422, body: { galat: "tanpa_rute_kursi_roda", pesan: "Tidak ditemukan rute tanpa tangga yang bisa dilewati kursi roda menurut data OpenStreetMap." } },
      { status: 200, body: osmRoute("jalan_kaki") },
      { status: 200, body: OBSTACLES },
    );
    render(<RouteCard target={{ kind: "osm", osmType: "node", osmId: 9001 }} name="Masjid Al-Hidayah" from={{ lat: -6.56, lng: 106.76 }} />, { wrapper: WithIntl });
    await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("Tidak ditemukan rute tanpa tangga"));
    expect(screen.getByRole("button", { name: "Kursi roda", pressed: true })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Coba lagi" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Lihat rute jalan kaki" }));
    await waitFor(() => expect(screen.getByText("1,5 km · sekitar 18 menit jalan kaki")).toBeTruthy());
    expect(screen.getByRole("button", { name: "Jalan kaki", pressed: true })).toBeTruthy();
  });

  it("says when the data coverage cannot be measured", async () => {
    const route = { ...osmRoute("kursi_roda"), coverage: { sidewalkPercent: null, surfacePercent: null, crossings: null, crossingsWithKerb: null, dataDate: null } };
    mockFetch({ status: 200, body: route }, { status: 200, body: OBSTACLES });
    render(<RouteCard target={{ kind: "osm", osmType: "node", osmId: 9001 }} name="Masjid Al-Hidayah" from={{ lat: -6.56, lng: 106.76 }} />, { wrapper: WithIntl });
    await waitFor(() => expect(screen.getByText("Kelengkapan data belum bisa dihitung untuk rute ini.")).toBeTruthy());
    expect(screen.queryByText(/Data OpenStreetMap per/)).toBeNull();
  });
});

describe("StartPoint", () => {
  it("takes its own copy and heading level, and says where the point came from", () => {
    grantLocation({ coords: { latitude: -6.56, longitude: 106.76 } });
    const onStart = vi.fn();
    render(<StartPoint onStart={onStart} level={3} copy={{ title: "Titik awal", why: "Untuk tempat terdekat.", privacy: "Tidak dikirim ke AI." }} />, { wrapper: WithIntl });
    expect(screen.getByRole("heading", { level: 3, name: "Titik awal" })).toBeTruthy();
    expect(screen.getByText("Untuk tempat terdekat.")).toBeTruthy();
    expect(screen.getByText("Tidak dikirim ke AI.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Pakai lokasi saya" }));
    expect(onStart).toHaveBeenCalledWith({ lat: -6.56, lng: 106.76 }, "perangkat");
  });
});
