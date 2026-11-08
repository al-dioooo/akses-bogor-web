import { expect, test, type APIRequestContext } from "@playwright/test";
import { webServerSecret } from "../playwright.config";
import { mockApi, signIn, uniqueEmail } from "./akun-masuk";
import { png } from "./foto";

// Di Vercel, x-forwarded-for berisi IP pengunjung; di sini nilainya diisi tes. Setiap project memakai IP sendiri
// karena project ponsel dan desktop berjalan bersamaan.
const visitorIp = (project: string) => (project === "ponsel" ? "198.51.100.7" : "198.51.100.8");

/** Rahasia server web yang diterima API tiruan untuk IP pengunjung dan path API itu, atau null. */
async function secretSeen(request: APIRequestContext, ip: string, path?: string) {
  const query = new URLSearchParams({ ip, ...(path ? { path } : {}) });
  const res = await request.get(`${mockApi()}/_tiruan/pengunjung?${query}`);
  return ((await res.json()) as { secret: string | null }).secret;
}

test("sends the web server secret and the visitor ip when rendering a page", async ({ browser, request }, testInfo) => {
  const ip = visitorIp(testInfo.project.name);
  const context = await browser.newContext({ extraHTTPHeaders: { "x-forwarded-for": ip } });
  const page = await context.newPage();
  await page.goto("/");
  expect(await secretSeen(request, ip, "/places/stats")).toBe(webServerSecret);
  await context.close();
});

test("sends them from server actions, route handlers, and the photo upload", async ({ browser, request }, testInfo) => {
  const ip = visitorIp(testInfo.project.name);
  const context = await browser.newContext({ extraHTTPHeaders: { "x-forwarded-for": `${ip}, 10.0.0.1` } });
  const page = await context.newPage();

  // Masuk berjalan lewat server action: kirim kode, lalu periksa kode.
  await signIn(page, uniqueEmail("lama", testInfo.project.name));
  expect(await secretSeen(request, ip, "/auth/code")).toBe(webServerSecret);
  expect(await secretSeen(request, ip, "/auth/code/verify")).toBe(webServerSecret);

  // Route handler Laporkan dan Peta memakai cookie sesi dan header yang sama dengan halaman.
  expect((await page.request.post("/laporkan/cari", { data: { q: "halte" } })).ok()).toBe(true);
  expect(await secretSeen(request, ip, "/map/search")).toBe(webServerSecret);

  expect((await page.request.post("/laporkan/cek-lokasi", { data: { location: { lat: -6.5971, lng: 106.806 } } })).ok()).toBe(true);
  expect(await secretSeen(request, ip, "/reports/location-check")).toBe(webServerSecret);

  expect((await page.request.get("/peta/kunci")).ok()).toBe(true);
  expect(await secretSeen(request, ip, "/map/token")).toBe(webServerSecret);

  const upload = await page.request.post("/laporkan/foto", { headers: { "content-type": "image/png" }, data: png(64, 48) });
  expect(upload.status()).toBe(201);
  expect(await secretSeen(request, ip, "/reports/photos")).toBe(webServerSecret);

  await context.close();
});
