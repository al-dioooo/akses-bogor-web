import { expect, test } from "@playwright/test";
import { signIn, uniqueEmail } from "./akun-masuk";

// Pemeriksaan asal untuk POST yang memakai sesi, di balik Cloudflare Tunnel (issue #165). cloudflared meneruskan alamat
// publik dan https, padahal server berjalan di http://127.0.0.1 (ADR-0048). Server tes berjalan dengan
// SITE_URL=https://akses-bogor.aldio.dev (playwright.config.ts).
const SITE = "https://akses-bogor.aldio.dev";
const TUNNEL_HEADERS = {
  host: "akses-bogor.aldio.dev",
  "x-forwarded-proto": "https",
  "x-forwarded-host": "akses-bogor.aldio.dev",
  "x-forwarded-for": "203.0.113.9",
  "cf-connecting-ip": "203.0.113.9",
};
const FROM_SITE = { ...TUNNEL_HEADERS, origin: SITE, "sec-fetch-site": "same-origin" };
// Tanpa `sec-fetch-site`, supaya yang menolak adalah daftar asal, bukan tanda dari browser.
const FROM_OTHER_SITE = { ...TUNNEL_HEADERS, origin: "https://jahat.example" };

const PNG = Buffer.from("89504e470d0a1a0a", "hex");
const ROUTES: { name: string; path: string; data: string | Buffer; type: string }[] = [
  { name: "Laporkan kirim", path: "/laporkan/kirim", data: "{}", type: "application/json" },
  { name: "the photo upload", path: "/laporkan/foto", data: PNG, type: "image/png" },
  { name: "Bantu memetakan tanya", path: "/laporkan/bantu-memetakan/tanya", data: "{}", type: "application/json" },
  { name: "Bantu memetakan rute", path: "/laporkan/bantu-memetakan/rute", data: "{}", type: "application/json" },
  { name: "Bantu memetakan hambatan", path: "/laporkan/bantu-memetakan/hambatan", data: "{}", type: "application/json" },
];

for (const route of ROUTES) {
  test(`${route.name} accepts posts from the public site behind the tunnel and refuses other sites`, async ({ request }) => {
    const post = (headers: Record<string, string>) =>
      request.post(route.path, { data: route.data, headers: { ...headers, "content-type": route.type } });

    // Lolos pemeriksaan asal, lalu berhenti di pemeriksaan sesi karena belum masuk.
    const fromSite = await post(FROM_SITE);
    expect(fromSite.status()).toBe(401);
    expect(await fromSite.json()).toMatchObject({ galat: "belum_masuk" });

    const fromOtherSite = await post(FROM_OTHER_SITE);
    expect(fromOtherSite.status()).toBe(403);
    expect(await fromOtherSite.json()).toMatchObject({ galat: "asal_tidak_valid" });
  });
}

test("a signed-in post from the public site reaches the report handler behind the tunnel", async ({ page }, testInfo) => {
  await signIn(page, uniqueEmail("lama", testInfo.project.name));
  const post = (headers: Record<string, string>) =>
    page.request.post("/laporkan/kirim", { data: "bukan json", headers: { ...headers, "content-type": "application/json" } });

  // Sampai ke pemeriksaan isi laporan: asal dan sesi sama-sama diterima.
  const fromSite = await post(FROM_SITE);
  expect(fromSite.status()).toBe(400);
  expect(await fromSite.json()).toMatchObject({ galat: "input_tidak_valid" });

  // Cookie sesi yang ikut terkirim tidak membuat situs lain diterima.
  expect((await post(FROM_OTHER_SITE)).status()).toBe(403);
});
