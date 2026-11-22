import { expect, test } from "@playwright/test";
import { mockApi, signIn, uniqueEmail } from "./akun-masuk";

// Route handler agen rute di server web (ADR-0042, ADR-0043) dengan API tiruan (e2e/mock-api/agen-rute.mjs).
const HALTE = "4037ba19-b366-45bc-aceb-270944fe9372";
const base = `/lokasi/${HALTE}/rute`;

test("needs a session for the route and the agent", async ({ request }) => {
  for (const [path, data] of [
    ["jalan-kaki", { from: { lat: -6.5965, lng: 106.7972 } }],
    ["hambatan", { polyline: "tiruan" }],
    ["tanya", { question: "Ada ramp?" }],
  ] as const) {
    const res = await request.post(`${base}/${path}`, { data });
    expect(res.status()).toBe(401);
    expect((await res.json()).galat).toBe("belum_masuk");
  }
});

test("passes the route, obstacles and questions through, and never sends the position to the agent", async ({ page }, testInfo) => {
  const email = uniqueEmail("lama", testInfo.project.name);
  await signIn(page, email);

  const route = await page.request.post(`${base}/jalan-kaki`, { data: { from: { lat: -6.5965, lng: 106.7972 } } });
  expect(route.status()).toBe(200);
  expect(route.headers()["cache-control"]).toBe("no-store");
  expect(await route.json()).toMatchObject({ destination: { placeId: HALTE }, warning: expect.stringContaining("kursi roda") });

  const obstacles = await page.request.post(`${base}/hambatan`, { data: { polyline: "tiruan" } });
  expect((await obstacles.json()).features).toHaveLength(2);

  const outside = await page.request.post(`${base}/jalan-kaki`, { data: { from: { lat: -6.2, lng: 106.82 } } });
  expect(outside.status()).toBe(422);
  expect((await outside.json()).galat).toBe("di_luar_kota_bogor");

  const ask = await page.request.post(`${base}/tanya`, {
    data: { question: "Ada ramp?", history: [{ role: "user", content: "Halo" }], from: { lat: -6.5965, lng: 106.7972 }, location: "-6.5965,106.7972" },
  });
  expect(ask.status()).toBe(200);
  expect((await ask.json()).sources[0]).toMatchObject({ type: "lokasi", placeId: HALTE });
  const sent = (await (await page.request.get(`${mockApi()}/_tiruan/agen-terakhir?email=${encodeURIComponent(email)}`)).json()).body;
  expect(sent).toEqual({ placeId: HALTE, question: "Ada ramp?", history: [{ role: "user", content: "Halo" }] });

  const busy = await page.request.post(`${base}/tanya`, { data: { question: "sibuk-tiruan" } });
  expect(busy.status()).toBe(503);
  expect(await busy.json()).toEqual({ galat: "agen_sibuk", pesan: "Agen sedang sibuk, coba lagi nanti." });
});

test("refuses requests from other sites and malformed input", async ({ page }, testInfo) => {
  await signIn(page, uniqueEmail("lama", testInfo.project.name));
  const foreign = await page.request.post(`${base}/tanya`, { data: { question: "Ada ramp?" }, headers: { origin: "https://jahat.example" } });
  expect(foreign.status()).toBe(403);
  expect((await page.request.post(`${base}/tanya`, { data: { question: "x" } })).status()).toBe(400);
  expect((await page.request.post(`${base}/jalan-kaki`, { data: { from: { lat: "utara" } } })).status()).toBe(400);
  expect((await page.request.post("/lokasi/bukan-uuid/rute/tanya", { data: { question: "Ada ramp?" } })).status()).toBe(400);
});
