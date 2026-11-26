import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { WithIntl } from "@/test/intl";
import { RouteAssistant } from "./route-assistant";

/** API tanpa rute OpenStreetMap (ADR-0055). */
const OSM_ROUTE_OFF = { status: 503, body: { galat: "rute_aksesibel_belum_aktif", pesan: "Rute dari data OpenStreetMap belum diatur di server." } };
const HALTE = "4037ba19-b366-45bc-aceb-270944fe9372";
const ANSWER = {
  answer: "Halte contoh berstatus Sebagian menurut data AksesBogor yang diperiksa tim.",
  sources: [{ type: "lokasi", placeId: HALTE, name: "Halte contoh", lastVerifiedAt: "2026-10-18T03:00:00.000Z" }],
  model: "claude-haiku-5-5",
  cards: [{ type: "rute", target: { kind: "aksesbogor", placeId: HALTE }, name: "Halte contoh" }],
};
const ROUTE = {
  destination: { placeId: HALTE, osm: null, name: "Halte contoh", location: { lat: -6.5958, lng: 106.7942 } },
  distanceMeters: 400,
  durationSeconds: 300,
  steps: [{ instruction: "Berjalan ke barat", distanceMeters: 400, durationSeconds: 300, name: null, maneuver: "depart", location: { lat: -6.5965, lng: 106.7972 } }],
  geometry: { type: "LineString", coordinates: [[106.7972, -6.5965], [106.7942, -6.5958]] },
  polyline: "abc",
  warning: "Rute ini rute jalan kaki dari Mapbox. Rute ini tidak memperhitungkan tangga, trotoar, kerb, atau kemiringan jalan, jadi belum tentu bisa dilewati kursi roda.",
  attribution: "© Mapbox © OpenStreetMap",
};
const OBSTACLES = { bufferMeters: 20, truncated: false, features: [], note: "Data OpenStreetMap bisa tidak lengkap.", attribution: "© kontributor OpenStreetMap" };

type Reply = { status: number; body: unknown };
function mockFetch(byUrl: Record<string, Reply[]>) {
  const fetch = vi.fn(async (url: string) => {
    const reply = byUrl[url]!.shift()!;
    return new Response(JSON.stringify(reply.body), { status: reply.status, headers: { "content-type": "application/json" } });
  });
  vi.stubGlobal("fetch", fetch);
  return fetch;
}
const bodyOf = (fetch: ReturnType<typeof mockFetch>, url: string) =>
  (fetch.mock.calls as unknown as [string, RequestInit][]).filter(([called]) => called === url).map(([, init]) => JSON.parse(init.body as string));

function grantLocation(coords: { latitude: number; longitude: number }) {
  const getCurrentPosition = vi.fn((ok: PositionCallback) => ok({ coords: { ...coords, accuracy: 8 } } as GeolocationPosition));
  Object.defineProperty(navigator, "geolocation", { value: { getCurrentPosition }, configurable: true });
}

async function ask(question: string) {
  fireEvent.change(screen.getByRole("textbox", { name: "Pertanyaan Anda" }), { target: { value: question } });
  fireEvent.click(screen.getByRole("button", { name: "Kirim pertanyaan" }));
}

afterEach(() => {
  vi.unstubAllGlobals();
  Reflect.deleteProperty(navigator, "geolocation");
});

describe("RouteAssistant", () => {
  it("sends the start point and chosen place with the question, then draws the route card from that start point", async () => {
    grantLocation({ latitude: -6.5965, longitude: 106.7972 });
    const fetch = mockFetch({ "/tanya-rute/tanya": [{ status: 200, body: ANSWER }], "/tanya-rute/rute": [OSM_ROUTE_OFF, { status: 200, body: ROUTE }], "/tanya-rute/hambatan": [{ status: 200, body: OBSTACLES }] });
    render(<RouteAssistant place={{ id: HALTE, name: "Halte contoh" }} questionsPerDay={5} />, { wrapper: WithIntl });
    expect(screen.getByRole("link", { name: "Kebijakan Privasi" }).getAttribute("href")).toBe("/kebijakan-privasi");
    expect(screen.getByText("Tujuan: Halte contoh")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Pakai lokasi saya" }));
    expect(screen.getByText("Titik awal: lokasi perangkat Anda.")).toBeTruthy();
    await ask("Bagaimana cara ke Halte contoh?");

    await waitFor(() => expect(screen.getByText(ANSWER.answer)).toBeTruthy());
    expect(bodyOf(fetch, "/tanya-rute/tanya")[0]).toEqual({ question: "Bagaimana cara ke Halte contoh?", history: [], placeId: HALTE, from: { lat: -6.5965, lng: 106.7972 } });
    expect(screen.getByRole("link", { name: /Data terverifikasi AksesBogor: Halte contoh/ }).getAttribute("href")).toBe(`/lokasi/${HALTE}`);
    await waitFor(() => expect(screen.getByText(ROUTE.warning)).toBeTruthy());
    // Rute OpenStreetMap diminta dulu (ADR-0055); API tiruan menjawab belum aktif, lalu kartu memakai rute Mapbox.
    expect(bodyOf(fetch, "/tanya-rute/rute")).toEqual([
      { from: { lat: -6.5965, lng: 106.7972 }, placeId: HALTE, profil: "kursi_roda" },
      { from: { lat: -6.5965, lng: 106.7972 }, placeId: HALTE },
    ]);
    expect((screen.getByRole("textbox", { name: "Pertanyaan Anda" }) as HTMLTextAreaElement).value).toBe("");
  });

  it("asks without a start point or place once they are cleared", async () => {
    const fetch = mockFetch({ "/tanya-rute/tanya": [{ status: 200, body: { ...ANSWER, cards: [] } }] });
    render(<RouteAssistant place={{ id: HALTE, name: "Halte contoh" }} questionsPerDay={5} />, { wrapper: WithIntl });
    fireEvent.click(screen.getByRole("button", { name: "Hapus tujuan" }));
    expect(screen.queryByText("Tujuan: Halte contoh")).toBeNull();
    await ask("Masjid terdekat yang aksesibel");
    await waitFor(() => expect(screen.getByText(ANSWER.answer)).toBeTruthy());
    expect(bodyOf(fetch, "/tanya-rute/tanya")[0]).toEqual({ question: "Masjid terdekat yang aksesibel", history: [] });
  });

  it("shows the quota message from the API without marking the question as wrong", async () => {
    const pesan = "Jatah 5 pertanyaan hari ini sudah habis. Coba lagi besok, atau masuk untuk memakai jatah akun Anda.";
    mockFetch({ "/tanya-rute/tanya": [{ status: 429, body: { galat: "kuota_habis", pesan } }] });
    render(<RouteAssistant questionsPerDay={5} />, { wrapper: WithIntl });
    await ask("Rute ke rumah sakit terdekat dari sini");
    await waitFor(() => expect(screen.getByRole("alert").textContent).toBe(pesan));
    const field = screen.getByRole("textbox", { name: "Pertanyaan Anda" });
    expect(field.getAttribute("aria-invalid")).toBeNull();
    expect((field as HTMLTextAreaElement).value).toBe("Rute ke rumah sakit terdekat dari sini");
  });

  it("refuses a question that is too short before sending it", () => {
    const fetch = mockFetch({});
    render(<RouteAssistant questionsPerDay={5} />, { wrapper: WithIntl });
    fireEvent.click(screen.getByRole("button", { name: "Kirim pertanyaan" }));
    expect(screen.getByRole("alert").textContent).toBe("Tulis pertanyaan paling sedikit 2 karakter.");
    expect(fetch).not.toHaveBeenCalled();
  });
});
