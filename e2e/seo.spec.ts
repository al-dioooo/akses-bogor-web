import { expect, test } from "@playwright/test";

// Issue #114: tanpa SITE_INDEXABLE=true (seperti di staging dan tes ini), tidak ada yang boleh diindeks.
const HALTE = "4037ba19-b366-45bc-aceb-270944fe9372";
const DETAIL_DESCRIPTION =
  /^Halte di Kecamatan Bogor Tengah, Kota Bogor\. Status aksesibilitas: Sebagian\. 2 dari 3 fasilitas tersedia\. Terakhir diverifikasi \d+ \w+ \d{4}\.$/;

test("robots.txt blocks every crawler while indexing is off", async ({ request }) => {
  const response = await request.get("/robots.txt");
  expect(response.ok()).toBe(true);
  const body = await response.text();
  expect(body).toMatch(/User-Agent: \*\s+Disallow: \/\s*$/);
  expect(body).not.toContain("Sitemap:");
});

for (const path of ["/", "/jelajahi", "/tentang", `/lokasi/${HALTE}`, "/masuk"]) {
  test(`${path} tells crawlers not to index it while indexing is off`, async ({ page }) => {
    await page.goto(path);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex, nofollow");
  });
}

test("the sitemap lists public pages and published places, never account pages", async ({ request }) => {
  const response = await request.get("/sitemap.xml");
  expect(response.ok()).toBe(true);
  const locs = [...(await response.text()).matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => new URL(match[1]).pathname);
  expect(locs).toEqual(expect.arrayContaining(["/", "/jelajahi", "/peta", "/aksesibilitas", "/kebijakan-privasi", `/lokasi/${HALTE}`]));
  expect(locs.filter((path) => /^\/(akun|masuk|laporkan|verifikasi)/.test(path))).toEqual([]);
});

// Setiap halaman publik punya judul, deskripsi, URL kanonis, dan kartu berbagi sendiri.
const PUBLIC = [
  { path: "/", title: "AksesBogor: info aksesibilitas tempat umum di Kota Bogor", description: /^Cek ramp, toilet difabel/ },
  { path: "/jelajahi?q=halte&page=2", canonical: "/jelajahi", title: "Jelajahi Lokasi · AksesBogor", description: /^Cari kampus, masjid/ },
  { path: "/peta", title: "Peta Lokasi · AksesBogor", description: /pada peta/ },
  { path: "/aksesibilitas", title: "Mengenal aksesibilitas · AksesBogor", description: /^Draf: / },
  { path: "/tentang", title: "Tentang AksesBogor · AksesBogor", description: /^Apa itu AksesBogor/ },
  { path: "/syarat", title: "Syarat Layanan · AksesBogor", description: /^Draf syarat layanan/ },
];

for (const { path, canonical = path, title, description } of PUBLIC) {
  test(`${path} has its own title, description, canonical address and share cards`, async ({ page }) => {
    await page.goto(path);
    await expect(page).toHaveTitle(title);
    const head = page.locator("head");
    await expect(head.locator('meta[name="description"]')).toHaveAttribute("content", description);
    expect(new URL((await head.locator('link[rel="canonical"]').getAttribute("href")) ?? "").pathname).toBe(canonical);
    expect(new URL((await head.locator('meta[property="og:url"]').getAttribute("content")) ?? "").pathname).toBe(canonical);
    await expect(head.locator('meta[property="og:description"]')).toHaveAttribute("content", description);
    await expect(head.locator('meta[property="og:locale"]')).toHaveAttribute("content", "id_ID");
    await expect(head.locator('meta[name="twitter:card"]')).toHaveAttribute("content", "summary_large_image");
  });
}

test("Detail lokasi describes the place from its verified data", async ({ page }) => {
  await page.goto(`/lokasi/${HALTE}`);
  await expect(page).toHaveTitle("Halte contoh, Bogor Tengah · AksesBogor");
  // Halaman dinamis: Next.js mengalirkan metadata ke body untuk browser dan Googlebot (dokumentasi generateMetadata).
  await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", DETAIL_DESCRIPTION);
  expect(new URL((await page.locator('link[rel="canonical"]').getAttribute("href")) ?? "").pathname).toBe(`/lokasi/${HALTE}`);
});

test("link previews get the place description in the document head", async ({ request }) => {
  const html = await (await request.get(`/lokasi/${HALTE}`, { headers: { "user-agent": "WhatsApp/2.23.20.0" } })).text();
  const head = html.slice(0, html.indexOf("</head>"));
  const description = head.match(/<meta name="description" content="([^"]+)"/)?.[1];
  expect(description).toMatch(DETAIL_DESCRIPTION);
  expect(head).toContain('<meta property="og:title" content="Halte contoh, Bogor Tengah"/>');
});

test("pages that need an account have no canonical address or share card", async ({ page }) => {
  await page.goto("/masuk");
  await expect(page.locator('head link[rel="canonical"]')).toHaveCount(0);
  await expect(page.locator('head meta[property="og:url"]')).toHaveCount(0);
});

// Gambar berbagi: bawaan untuk halaman statis, kartu lokasi untuk Detail lokasi.
async function pngSize(body: Buffer) {
  expect(body.subarray(1, 4).toString()).toBe("PNG");
  return { width: body.readUInt32BE(16), height: body.readUInt32BE(20) };
}

async function shareImage(request: import("@playwright/test").APIRequestContext, path: string) {
  const html = await (await request.get(path, { headers: { "user-agent": "WhatsApp/2.23.20.0" } })).text();
  const head = html.slice(0, html.indexOf("</head>"));
  const og = head.match(/<meta property="og:image" content="([^"]+)"/)?.[1];
  const twitter = head.match(/<meta name="twitter:image" content="([^"]+)"/)?.[1];
  expect(og).toBeTruthy();
  expect(twitter).toBe(og);
  const url = new URL(og ?? "");
  return { path: url.pathname + url.search, alt: head.match(/<meta property="og:image:alt" content="([^"]+)"/)?.[1] };
}

for (const path of ["/", "/tentang", "/jelajahi"]) {
  test(`${path} shares the default AksesBogor image`, async ({ request }) => {
    const image = await shareImage(request, path);
    expect(image.path).toMatch(/^\/opengraph-image/);
    expect(image.alt).toMatch(/^AksesBogor, peta aksesibilitas Kota Bogor/);
    const response = await request.get(image.path);
    expect(response.headers()["content-type"]).toBe("image/png");
    expect(await pngSize(await response.body())).toEqual({ width: 1200, height: 630 });
  });
}

test("Detail lokasi shares a card made from the place data", async ({ request }) => {
  const image = await shareImage(request, `/lokasi/${HALTE}`);
  expect(image.path).toMatch(new RegExp(`^/lokasi/${HALTE}/opengraph-image`));
  const response = await request.get(image.path);
  expect(response.headers()["content-type"]).toBe("image/png");
  expect(await pngSize(await response.body())).toEqual({ width: 1200, height: 630 });
});

test("there is no share card for a place that does not exist", async ({ request }) => {
  const response = await request.get("/lokasi/00000000-0000-4000-8000-000000000000/opengraph-image");
  expect(response.status()).toBe(404);
});

// Data terstruktur dan manifest.
async function jsonLd(page: import("@playwright/test").Page) {
  const scripts = await page.locator('script[type="application/ld+json"]').allTextContents();
  return scripts.map((text) => JSON.parse(text));
}

test("Beranda describes the site and its search for search engines", async ({ page }) => {
  await page.goto("/");
  const [data] = await jsonLd(page);
  const [site, organization] = data["@graph"];
  expect(site["@type"]).toBe("WebSite");
  expect(new URL(site.potentialAction.target.urlTemplate.replace("{search_term_string}", "halte")).pathname).toBe("/jelajahi");
  expect(organization).toMatchObject({ "@type": "Organization", name: "AksesBogor" });
});

test("Detail lokasi describes the place with only verified facilities", async ({ page }) => {
  await page.goto(`/lokasi/${HALTE}`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Halte contoh");
  const [place] = await jsonLd(page);
  expect(place).toMatchObject({
    "@type": "Place",
    name: "Halte contoh",
    containedInPlace: { "@type": "AdministrativeArea", name: "Kecamatan Bogor Tengah" },
    geo: { "@type": "GeoCoordinates", latitude: -6.5958, longitude: 106.7942 },
  });
  expect(place.description).toMatch(DETAIL_DESCRIPTION);
  // Toilet difabel dijawab Tidak perlu, jadi tidak dimasukkan.
  expect(place.amenityFeature).toEqual([
    { "@type": "LocationFeatureSpecification", name: "Ramp / Jalur Landai", value: true },
    { "@type": "LocationFeatureSpecification", name: "Guiding Block", value: false },
    { "@type": "LocationFeatureSpecification", name: "Lift / Elevator", value: true },
  ]);
});

test("the web app manifest names the app and uses the brand colours", async ({ page, request }) => {
  await page.goto("/");
  const href = await page.locator('link[rel="manifest"]').getAttribute("href");
  const manifest = await (await request.get(href ?? "")).json();
  expect(manifest).toMatchObject({ name: "AksesBogor", lang: "id", start_url: "/", display: "standalone", theme_color: "#6440E8" });
});
