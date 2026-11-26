import { expect, test } from "@playwright/test";
import { signIn, uniqueEmail } from "./akun-masuk";

// Route handler rute dan hambatan untuk akun di server web (ADR-0042, ADR-0043) dengan API tiruan
// (e2e/mock-api/agen-rute.mjs). Pertanyaan ke agen kini lewat /agen/tanya (ADR-0054, e2e/agen-api.spec.ts).
const HALTE = "4037ba19-b366-45bc-aceb-270944fe9372";
const base = "/laporkan/bantu-memetakan";
const from = { lat: -6.5965, lng: 106.7972 };

test("needs a session for the route", async ({ request }) => {
  for (const [path, data] of [
    ["rute", { from, placeId: HALTE }],
    ["hambatan", { polyline: "tiruan" }],
  ] as const) {
    const res = await request.post(`${base}/${path}`, { data });
    expect(res.status()).toBe(401);
    expect((await res.json()).galat).toBe("belum_masuk");
  }
});

test("passes routes to AksesBogor places and OSM facilities and their obstacles through", async ({ page }, testInfo) => {
  const email = uniqueEmail("lama", testInfo.project.name);
  await signIn(page, email);

  const toPlace = await page.request.post(`${base}/rute`, { data: { from, placeId: HALTE } });
  expect(toPlace.status()).toBe(200);
  expect(toPlace.headers()["cache-control"]).toBe("no-store");
  expect(await toPlace.json()).toMatchObject({ destination: { placeId: HALTE, osm: null }, warning: expect.stringContaining("kursi roda") });
  const toOsm = await page.request.post(`${base}/rute`, { data: { from, osm: { type: "node", id: 9001 } } });
  expect(await toOsm.json()).toMatchObject({ destination: { placeId: null, osm: { type: "node", id: 9001 }, name: "Masjid Al-Hidayah" } });

  const obstacles = await page.request.post(`${base}/hambatan`, { data: { polyline: "tiruan" } });
  expect((await obstacles.json()).features).toHaveLength(2);

  const outside = await page.request.post(`${base}/rute`, { data: { from: { lat: -6.2, lng: 106.82 }, placeId: HALTE } });
  expect(outside.status()).toBe(422);
  expect((await outside.json()).galat).toBe("di_luar_kota_bogor");
});

test("refuses requests from other sites and malformed input", async ({ page }, testInfo) => {
  await signIn(page, uniqueEmail("lama", testInfo.project.name));
  const foreign = await page.request.post(`${base}/rute`, { data: { from, placeId: HALTE }, headers: { origin: "https://jahat.example" } });
  expect(foreign.status()).toBe(403);
  for (const [path, data] of [
    ["rute", { from: { lat: "utara" }, placeId: HALTE }],
    ["rute", { from }],
    ["rute", { from, osm: { type: "area", id: 1 } }],
  ] as const) {
    expect((await page.request.post(`${base}/${path}`, { data })).status()).toBe(400);
  }
});
