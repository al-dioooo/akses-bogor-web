import { expect, test } from "@playwright/test";

// Status HTTP Detail lokasi (issue #150). Status hanya bisa diatur sebelum streaming dimulai, jadi src/proxy.ts mengecek
// lokasi lebih dulu. Status dicek dari respons pertama server, untuk browser dan untuk bot pratinjau tautan.
const KNOWN = "/lokasi/b3e865a0-3b4a-4ab0-a42e-65fea37bd33e";
const UNKNOWN = "/lokasi/00000000-0000-4000-8000-000000000000";
const MALFORMED = "/lokasi/bukan-id-lokasi";
// API tiruan selalu menjawab 500 untuk id ini (e2e/mock-api/server.mjs).
const FAILING = "/lokasi/00000000-0000-4000-8000-000000000500";
// Bot yang hanya membaca HTML mendapat render dinamis penuh dengan metadata di <head>, bukan kerangka statis.
const LINK_PREVIEW_BOT = "WhatsApp/2.23.20.0 A";
const CLIENTS: { name: string; headers: Record<string, string> }[] = [
  { name: "browser", headers: {} },
  { name: "link preview bot", headers: { "user-agent": LINK_PREVIEW_BOT } },
];

const SHARE_IMAGE = /<meta[^>]+(property="og:image|name="twitter:image)/;

test("a known place answers 200 and offers its share card", async ({ request }) => {
  for (const client of CLIENTS) {
    const response = await request.get(KNOWN, { headers: client.headers });
    expect(response.status(), client.name).toBe(200);
    expect(await response.text(), client.name).toMatch(SHARE_IMAGE);
  }
});

for (const [name, path] of [
  ["an unknown place", UNKNOWN],
  ["a malformed id", MALFORMED],
]) {
  test(`${name} answers 404 without a share card`, async ({ request }) => {
    for (const client of CLIENTS) {
      const response = await request.get(path, { headers: client.headers });
      expect(response.status(), client.name).toBe(404);
      const html = await response.text();
      // Judul harus ada di HTML dari server, bukan hanya di data RSC yang dirender browser.
      expect(html, client.name).toMatch(/<h1[^>]*>Lokasi ini tidak ada\.<\/h1>/);
      expect(html, client.name).not.toMatch(SHARE_IMAGE);
    }
  });
}

test("the not-found page keeps the place address and its own title", async ({ page }) => {
  const response = await page.goto(UNKNOWN);
  expect(response?.status()).toBe(404);
  await expect(page).toHaveURL(new RegExp(`${UNKNOWN}$`));
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Lokasi ini tidak ada.");
  await expect(page).toHaveTitle("Lokasi tidak ditemukan · AksesBogor");
});

test("an api failure answers 503 with a retry instead of a fake 404", async ({ page, request }) => {
  for (const client of CLIENTS) {
    const response = await request.get(FAILING, { headers: client.headers });
    expect(response.status(), client.name).toBe(503);
    expect(response.headers()["retry-after"], client.name).toBe("60");
  }
  await page.goto(FAILING);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Data belum bisa dimuat");
  await expect(page.getByRole("link", { name: "Coba lagi" })).toHaveAttribute("href", FAILING);
  await expect(page.getByRole("link", { name: "Kembali ke Jelajahi" })).toHaveAttribute("href", "/jelajahi");
  await expect(page.getByText("Lokasi ini tidak ada.")).toHaveCount(0);
});

test("the share card answers 404 only for places that do not exist", async ({ request }) => {
  expect((await request.get(`${UNKNOWN}/opengraph-image`)).status()).toBe(404);
  expect((await request.get(`${MALFORMED}/opengraph-image`)).status()).toBe(404);
  expect((await request.get(`${FAILING}/opengraph-image`)).status()).toBe(500);
});
