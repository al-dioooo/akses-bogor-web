import { expect, test } from "@playwright/test";
import { mockApi, signIn, uniqueEmail } from "./akun-masuk";

// Route handler Agen AI di server web (ADR-0054) dengan API tiruan (e2e/mock-api/tanya-rute.mjs dan agen-rute.mjs).
// Tanpa sesi pertanyaan diteruskan apa adanya; dengan sesi web meminta alat kontributor dan API yang memutuskan.
const HALTE = "4037ba19-b366-45bc-aceb-270944fe9372";
const from = { lat: -6.5965, lng: 106.7972 };
const sent = async (request: { get: (url: string) => Promise<{ json: () => Promise<unknown> }> }, ip: string) =>
  ((await (await request.get(`${mockApi()}/_tiruan/asisten-terakhir?ip=${ip}`)).json()) as { body: unknown }).body;

test("passes a visitor's question, history, place and start point through, without contributor tools", async ({ playwright }) => {
  const ip = "198.51.100.81";
  const request = await playwright.request.newContext({ baseURL: test.info().project.use.baseURL, extraHTTPHeaders: { "x-forwarded-for": ip } });
  const ask = await request.post("/agen/tanya", { data: { question: "Rute ke halte terdekat?", history: [{ role: "user", content: "Halo" }], from, placeId: HALTE, contributorTools: true } });
  expect(ask.status()).toBe(200);
  expect(ask.headers()["cache-control"]).toBe("no-store");
  expect((await ask.json()).cards).toEqual([{ type: "rute", target: { kind: "aksesbogor", placeId: HALTE }, name: "Halte contoh" }]);
  expect(await sent(request, ip)).toEqual({ question: "Rute ke halte terdekat?", history: [{ role: "user", content: "Halo" }], placeId: HALTE, from });

  const quota = await request.post("/agen/tanya", { data: { question: "kuota-tiruan" } });
  expect(quota.status()).toBe(429);
  expect((await quota.json()).galat).toBe("kuota_habis");
  await request.dispose();
});

test("asks for the contributor tools when the visitor is signed in", async ({ page }, testInfo) => {
  const ip = "198.51.100.82";
  await page.context().setExtraHTTPHeaders({ "x-forwarded-for": ip });
  await signIn(page, uniqueEmail("lama", testInfo.project.name));
  const ask = await page.request.post("/agen/tanya", { data: { question: "Masjid mana yang belum didata?" } });
  expect(ask.status()).toBe(200);
  expect((await ask.json()).cards.map((card: { type: string }) => card.type)).toEqual(["prioritas", "tempat", "tempat", "rute"]);
  expect(await sent(page.request, ip)).toEqual({ question: "Masjid mana yang belum didata?", history: [], contributorTools: true });
});

test("refuses other sites and malformed questions", async ({ request }) => {
  expect((await request.post("/agen/tanya", { data: { question: "Rute?" }, headers: { origin: "https://jahat.example" } })).status()).toBe(403);
  for (const data of [{ question: "x" }, { question: "Rute ke halte?", from: { lat: "x", lng: 1 } }, { question: "Rute?", placeId: "bukan-id" }]) {
    const res = await request.post("/agen/tanya", { data });
    expect(res.status()).toBe(400);
    expect((await res.json()).galat).toBe("input_tidak_valid");
  }
});
