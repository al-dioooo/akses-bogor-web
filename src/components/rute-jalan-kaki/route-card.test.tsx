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
    const fetch = mockFetch({ status: 200, body: ROUTE }, { status: 200, body: OBSTACLES });
    render(<RouteCard target={{ kind: "osm", osmType: "node", osmId: 9001 }} name="Masjid Al-Hidayah" />, { wrapper: WithIntl });
    expect(screen.getByRole("heading", { name: "Rute jalan kaki ke Masjid Al-Hidayah" })).toBeTruthy();
    expect(screen.getByText(/tidak pernah dikirim ke agen AI/)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Pakai lokasi saya" }));
    await waitFor(() => expect(screen.getByText("1,5 km · sekitar 18 menit jalan kaki")).toBeTruthy());
    // Fokus dipindah efek setelah render, jadi ditunggu juga.
    await waitFor(() => expect(document.activeElement?.textContent).toBe("1,5 km · sekitar 18 menit jalan kaki"));
    expect(screen.getByText(WARNING)).toBeTruthy();
    expect(screen.getByRole("region", { name: "Langkah" }).querySelectorAll("li")).toHaveLength(2);
    await waitFor(() => expect(screen.getByText("Tangga, 4 anak tangga")).toBeTruthy());
    expect(screen.getByRole("link", { name: /^Lihat di OpenStreetMap\s*\(Tangga, 4 anak tangga\)$/ }).getAttribute("href")).toBe("https://www.openstreetmap.org/way/1");
    expect(JSON.parse((fetch.mock.calls[0] as unknown as [string, RequestInit])[1].body as string)).toEqual({ from: { lat: -6.56, lng: 106.76 }, osm: { type: "node", id: 9001 } });
    expect(JSON.parse((fetch.mock.calls[1] as unknown as [string, RequestInit])[1].body as string)).toEqual({ polyline: "abc" });
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
    const fetch = mockFetch({ status: 200, body: ROUTE }, { status: 200, body: OBSTACLES });
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
