import { expect, test } from "@playwright/test";
import { mockApi, signIn, uniqueEmail } from "./akun-masuk";

// Route handler agen bantu memetakan di server web (ADR-0042, ADR-0043) dengan API tiruan (e2e/mock-api/agen-rute.mjs).
const HALTE = "4037ba19-b366-45bc-aceb-270944fe9372";
const base = "/laporkan/bantu-memetakan";
const from = { lat: -6.5965, lng: 106.7972 };

test("needs a session for the route and the agent", async ({ request }) => {
  for (const [path, data] of [
    ["rute", { from, placeId: HALTE }],
    ["hambatan", { polyline: "tiruan" }],
    ["tanya", { question: "Di mana yang perlu dipetakan?" }],
  ] as const) {
    const res = await request.post(`${base}/${path}`, { data });
    expect(res.status()).toBe(401);
    expect((await res.json()).galat).toBe("belum_masuk");
  }
});

test("passes routes to AksesBogor places and OSM facilities, obstacles and questions through, never the position", async ({ page }, testInfo) => {
  const email = uniqueEmail("lama", testInfo.project.name);
  await signIn(page, email);

  const toPlace = await page.request.post(`${base}/rute`, { data: { from, placeId: HALTE } });
  expect(toPlace.status()).toBe(200);
  expect(toPlace.headers()["cache-control"]).toBe("no-store");
  expect(await toPlace.json()).toMatchObject({ destination: { placeId: HALTE }, warning: expect.stringContaining("kursi roda") });
  const toOsm = await page.request.post(`${base}/rute`, { data: { from, osm: { type: "node", id: 9001 } } });
  expect(await toOsm.json()).toMatchObject({ destination: { name: "Masjid Al-Hidayah" } });

  const obstacles = await page.request.post(`${base}/hambatan`, { data: { polyline: "tiruan" } });
  expect((await obstacles.json()).features).toHaveLength(2);

  const outside = await page.request.post(`${base}/rute`, { data: { from: { lat: -6.2, lng: 106.82 }, placeId: HALTE } });
  expect(outside.status()).toBe(422);
  expect((await outside.json()).galat).toBe("di_luar_kota_bogor");

  const ask = await page.request.post(`${base}/tanya`, {
    data: { question: "Di mana yang perlu dipetakan?", history: [{ role: "user", content: "Halo" }], from, location: "-6.5965,106.7972" },
  });
  expect(ask.status()).toBe(200);
  expect((await ask.json()).cards.map((card: { type: string }) => card.type)).toEqual(["prioritas", "tempat", "tempat", "rute"]);
  const sent = async () => (await (await page.request.get(`${mockApi()}/_tiruan/agen-terakhir?email=${encodeURIComponent(email)}`)).json()).body;
  expect(await sent()).toEqual({ question: "Di mana yang perlu dipetakan?", history: [{ role: "user", content: "Halo" }] });

  expect((await page.request.post(`${base}/tanya`, { data: { question: "Ada ramp?", placeId: HALTE } })).status()).toBe(200);
  expect(await sent()).toEqual({ question: "Ada ramp?", history: [], placeId: HALTE });

  const busy = await page.request.post(`${base}/tanya`, { data: { question: "sibuk-tiruan" } });
  expect(busy.status()).toBe(503);
  expect(await busy.json()).toEqual({ galat: "agen_sibuk", pesan: "Agen sedang sibuk, coba lagi nanti." });
});

test("refuses requests from other sites and malformed input", async ({ page }, testInfo) => {
  await signIn(page, uniqueEmail("lama", testInfo.project.name));
  const foreign = await page.request.post(`${base}/tanya`, { data: { question: "Ada ramp?" }, headers: { origin: "https://jahat.example" } });
  expect(foreign.status()).toBe(403);
  for (const [path, data] of [
    ["tanya", { question: "x" }],
    ["tanya", { question: "Ada ramp?", placeId: "bukan-uuid" }],
    ["rute", { from: { lat: "utara" }, placeId: HALTE }],
    ["rute", { from }],
    ["rute", { from, osm: { type: "area", id: 1 } }],
  ] as const) {
    expect((await page.request.post(`${base}/${path}`, { data })).status()).toBe(400);
  }
});
