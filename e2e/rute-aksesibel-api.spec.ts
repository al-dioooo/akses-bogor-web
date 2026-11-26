import { expect, test } from "@playwright/test";
import { mockApi, signIn, uniqueEmail } from "./akun-masuk";

// Route handler rute di server web meneruskan `profil` ke POST /route/accessible (ADR-0055), dengan API tiruan
// e2e/mock-api/rute-aksesibel.mjs: hanya IP 192.0.2.x yang mendapat rute OSM, IP lain mendapat 503
// rute_aksesibel_belum_aktif. Tanpa `profil`, handler tetap meminta rute Mapbox.
const HALTE = "4037ba19-b366-45bc-aceb-270944fe9372";
const NOTE = "Dihitung dari data OpenStreetMap; kondisi lapangan bisa berbeda.";
const from = { lat: -6.5965, lng: 106.7972 };
let ipCount = 0;
const onIp = () => `192.0.2.${210 + (ipCount++ % 40)}`;
const sent = async (request: { get: (url: string) => Promise<{ json: () => Promise<unknown> }> }, ip: string) =>
  ((await (await request.get(`${mockApi()}/_tiruan/rute-aksesibel-terakhir?ip=${ip}`)).json()) as { body: unknown }).body;

test("route handlers pass the profile to the API and keep the Mapbox route without it", async ({ playwright, browser }, testInfo) => {
  const ip = onIp();
  const request = await playwright.request.newContext({ baseURL: testInfo.project.use.baseURL, extraHTTPHeaders: { "x-forwarded-for": ip } });
  const route = await request.post("/tanya-rute/rute", { data: { from, placeId: HALTE, profil: "kursi_roda" } });
  expect(route.status()).toBe(200);
  expect(await route.json()).toMatchObject({ profil: "kursi_roda", note: NOTE, coverage: { sidewalkPercent: 62 }, destination: { placeId: HALTE } });
  expect(await sent(request, ip)).toEqual({ from, placeId: HALTE, profil: "kursi_roda" });
  expect((await request.post("/tanya-rute/rute", { data: { from, placeId: HALTE } })).status()).toBe(200);
  const wrong = await request.post("/tanya-rute/rute", { data: { from, placeId: HALTE, profil: "sepeda" } });
  expect(wrong.status()).toBe(400);
  expect((await wrong.json()).galat).toBe("input_tidak_valid");
  await request.dispose();

  const off = await playwright.request.newContext({ baseURL: testInfo.project.use.baseURL, extraHTTPHeaders: { "x-forwarded-for": "198.51.100.231" } });
  const refused = await off.post("/tanya-rute/rute", { data: { from, placeId: HALTE, profil: "kursi_roda" } });
  expect(refused.status()).toBe(503);
  expect((await refused.json()).galat).toBe("rute_aksesibel_belum_aktif");
  await off.dispose();

  const member = await browser.newContext({ extraHTTPHeaders: { "x-forwarded-for": onIp() } });
  const page = await member.newPage();
  await signIn(page, uniqueEmail("rute-aksesibel", testInfo.project.name));
  const contributor = await page.request.post("/laporkan/bantu-memetakan/rute", { data: { from, osm: { type: "node", id: 9001 }, profil: "jalan_kaki" } });
  expect(contributor.status()).toBe(200);
  expect(await contributor.json()).toMatchObject({ profil: "jalan_kaki", destination: { name: "Masjid Al-Hidayah" } });
  await member.close();
});
