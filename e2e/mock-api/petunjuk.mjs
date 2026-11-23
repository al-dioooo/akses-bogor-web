// Petunjuk aksesibilitas tiruan dari Mapbox dan Google (GET /places/:id/hints dan
// GET /places/candidates/:tipe/:id/hints), meniru akses-bogor-api (ADR-0052). "Halte contoh" punya petunjuk dari
// kedua penyedia, "Halte contoh B" selalu galat, kandidat node/9001 punya petunjuk Mapbox, dan tempat lain tidak punya.
// Pengunjung dengan IP 203.0.113.247 melihat petunjuk yang dimatikan. GET /_tiruan/petunjuk?ip=... menjawab berapa
// kali petunjuk diminta untuk IP itu, supaya tes bisa memastikan petunjuk tidak diminta per marker.
export const NO_HINTS_IP = "203.0.113.247";
const HALTE = "4037ba19-b366-45bc-aceb-270944fe9372";
const FAILING = "f2aeb27d-5f54-42f8-8368-780b6d62b51c";
const requests = new Map();

const none = [
  { provider: "mapbox", result: "none" },
  { provider: "google", result: "none" },
];

/** Menjawab route petunjuk, atau `null` bila bukan route itu. */
export function handlePetunjuk(method, url, headers, places) {
  if (method !== "GET") return null;
  const ip = headers["x-visitor-ip"];
  if (url.pathname === "/_tiruan/petunjuk") return [200, { count: requests.get(url.searchParams.get("ip")) ?? 0 }];
  const place = url.pathname.match(/^\/places\/([^/]+)\/hints$/)?.[1];
  const candidate = url.pathname.match(/^\/places\/candidates\/(node|way|relation)\/(\d+)\/hints$/);
  if (!place && !candidate) return null;
  requests.set(ip, (requests.get(ip) ?? 0) + 1);
  const headersOut = { "cache-control": "private, no-store" };
  if (ip === NO_HINTS_IP) return [200, { hints: [] }, headersOut];
  if (candidate) {
    const id = `${candidate[1]}/${candidate[2]}`;
    if (id !== "node/9001") return [200, { hints: none }, headersOut];
    return [200, { hints: [{ provider: "mapbox", result: "found", placeName: "Masjid Kandidat A", distanceMeters: 9, wheelchairAccessible: true }, none[1]] }, headersOut];
  }
  if (place === FAILING) return [503, { galat: "galat_server", pesan: "Galat tiruan." }];
  if (!places.some((p) => p.id === place)) return [404, { galat: "lokasi_tidak_ditemukan", pesan: "Lokasi tidak ditemukan." }];
  if (place !== HALTE) return [200, { hints: none }, headersOut];
  return [
    200,
    {
      hints: [
        { provider: "mapbox", result: "found", placeName: "Halte Contoh", distanceMeters: 12, wheelchairAccessible: true },
        {
          provider: "google",
          result: "found",
          placeName: "Halte Contoh Baranangsiang",
          distanceMeters: 20,
          url: "https://maps.google.com/?cid=123",
          accessibility: { entrance: true, restroom: null, parking: false, seating: null },
        },
      ],
    },
    headersOut,
  ];
}
