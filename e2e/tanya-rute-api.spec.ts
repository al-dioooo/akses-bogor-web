import { expect, test } from "@playwright/test";
import { mockApi, signIn, uniqueEmail } from "./akun-masuk";

// Route handler asisten rute publik di server web (ADR-0050) dengan API tiruan (e2e/mock-api/tanya-rute.mjs dan
// agen-rute.mjs). Tanpa sesi semuanya tetap jalan; tujuan rute hanya lokasi AksesBogor.
const HALTE = "4037ba19-b366-45bc-aceb-270944fe9372";
const from = { lat: -6.5965, lng: 106.7972 };
const sent = async (request: { get: (url: string) => Promise<{ json: () => Promise<unknown> }> }, ip: string) =>
  ((await (await request.get(`${mockApi()}/_tiruan/asisten-terakhir?ip=${ip}`)).json()) as { body: unknown }).body;

test("answers visitors without a session and passes the start point and place id through", async ({ playwright }) => {
  const ip = "198.51.100.71";
  const request = await playwright.request.newContext({ baseURL: test.info().project.use.baseURL, extraHTTPHeaders: { "x-forwarded-for": ip } });
  const ask = await request.post("/tanya-rute/tanya", { data: { question: "Rute ke halte terdekat?", history: [{ role: "user", content: "Halo" }], from, placeId: HALTE, lokasi: "x" } });
  expect(ask.status()).toBe(200);
  expect(ask.headers()["cache-control"]).toBe("no-store");
  expect((await ask.json()).cards).toEqual([{ type: "rute", target: { kind: "aksesbogor", placeId: HALTE }, name: "Halte contoh" }]);
  expect(await sent(request, ip)).toEqual({ question: "Rute ke halte terdekat?", history: [{ role: "user", content: "Halo" }], placeId: HALTE, from });

  const route = await request.post("/tanya-rute/rute", { data: { from, placeId: HALTE } });
  expect(route.status()).toBe(200);
  expect(await route.json()).toMatchObject({ destination: { placeId: HALTE }, warning: expect.stringContaining("kursi roda") });
  expect((await (await request.post("/tanya-rute/hambatan", { data: { polyline: "tiruan" } })).json()).features).toHaveLength(2);

  const quota = await request.post("/tanya-rute/tanya", { data: { question: "kuota-tiruan" } });
  expect(quota.status()).toBe(429);
  expect((await quota.json()).galat).toBe("kuota_habis");
  await request.dispose();
});

test("still works with a session", async ({ page }, testInfo) => {
  await signIn(page, uniqueEmail("lama", testInfo.project.name));
  expect((await page.request.post("/tanya-rute/tanya", { data: { question: "Rute ke halte?" } })).status()).toBe(200);
  expect((await page.request.post("/tanya-rute/rute", { data: { from, placeId: HALTE } })).status()).toBe(200);
});

test("refuses OpenStreetMap destinations, other sites and malformed input", async ({ request }) => {
  expect((await request.post("/tanya-rute/rute", { data: { from, osm: { type: "node", id: 9001 } } })).status()).toBe(400);
  expect((await request.post("/tanya-rute/tanya", { data: { question: "Rute?" }, headers: { origin: "https://jahat.example" } })).status()).toBe(403);
  for (const [path, data] of [
    ["tanya", { question: "x" }],
    ["tanya", { question: "Rute ke halte?", from: { lat: "x", lng: 1 } }],
    ["rute", { from: { lat: 91, lng: 0 }, placeId: HALTE }],
    ["hambatan", { polyline: 1 }],
  ] as const) {
    const res = await request.post(`/tanya-rute/${path}`, { data });
    expect(res.status()).toBe(400);
    expect((await res.json()).galat).toBe("input_tidak_valid");
  }
});
