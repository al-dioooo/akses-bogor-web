import { expect, test } from "@playwright/test";

// Issue #114: tanpa SITE_INDEXABLE=true (seperti di staging dan tes ini), tidak ada yang boleh diindeks.
const HALTE = "4037ba19-b366-45bc-aceb-270944fe9372";

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
