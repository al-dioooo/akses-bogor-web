import { expect, test } from "@playwright/test";
import { signIn, uniqueEmail } from "./akun-masuk";

// Route handler rute dan hambatan untuk pengunjung (ADR-0050), dipakai kartu rute Agen AI (ADR-0054), dengan API tiruan
// (e2e/mock-api/agen-rute.mjs). Tanpa sesi tetap jalan. Pertanyaan ke agen ada di e2e/agen-api.spec.ts.
const HALTE = "4037ba19-b366-45bc-aceb-270944fe9372";
const from = { lat: -6.5965, lng: 106.7972 };

test("gives visitors without a session the walking route and its obstacles", async ({ playwright }) => {
  const request = await playwright.request.newContext({ baseURL: test.info().project.use.baseURL, extraHTTPHeaders: { "x-forwarded-for": "198.51.100.71" } });
  const route = await request.post("/tanya-rute/rute", { data: { from, placeId: HALTE } });
  expect(route.status()).toBe(200);
  expect(await route.json()).toMatchObject({ destination: { placeId: HALTE }, warning: expect.stringContaining("kursi roda") });
  expect((await (await request.post("/tanya-rute/hambatan", { data: { polyline: "tiruan" } })).json()).features).toHaveLength(2);
  await request.dispose();
});

test("still works with a session", async ({ page }, testInfo) => {
  await signIn(page, uniqueEmail("lama", testInfo.project.name));
  expect((await page.request.post("/tanya-rute/rute", { data: { from, placeId: HALTE } })).status()).toBe(200);
});

test("refuses OpenStreetMap destinations, other sites and malformed input", async ({ request }) => {
  // Kandidat OpenStreetMap (ADR-0049) boleh menjadi tujuan; tujuan yang salah bentuk tetap 400.
  expect((await request.post("/tanya-rute/rute", { data: { from, osm: { type: "node", id: 9001 } } })).status()).toBe(200);
  expect((await request.post("/tanya-rute/rute", { data: { from, osm: { type: "area", id: 9001 } } })).status()).toBe(400);
  expect((await request.post("/tanya-rute/rute", { data: { from, placeId: HALTE }, headers: { origin: "https://jahat.example" } })).status()).toBe(403);
  for (const [path, data] of [
    ["rute", { from: { lat: 91, lng: 0 }, placeId: HALTE }],
    ["hambatan", { polyline: 1 }],
  ] as const) {
    const res = await request.post(`/tanya-rute/${path}`, { data });
    expect(res.status()).toBe(400);
    expect((await res.json()).galat).toBe("input_tidak_valid");
  }
});
