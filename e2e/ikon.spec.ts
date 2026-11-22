import { expect, test, type APIRequestContext } from "@playwright/test";

// Issue #127: favicon, Apple touch icon, dan ikon manifest dari tanda pin dan pintu.
async function pngSize(request: APIRequestContext, path: string) {
  const response = await request.get(path);
  expect(response.ok(), path).toBe(true);
  expect(response.headers()["content-type"]).toBe("image/png");
  const body = await response.body();
  return { width: body.readUInt32BE(16), height: body.readUInt32BE(20) };
}

test("every page links the SVG favicon, the ICO fallback and the Apple touch icon", async ({ page, request }) => {
  await page.goto("/tentang");
  const head = page.locator("head");

  const svg = await head.locator('link[rel="icon"][type="image/svg+xml"]').getAttribute("href");
  const svgResponse = await request.get(svg ?? "");
  expect(svgResponse.headers()["content-type"]).toContain("image/svg+xml");
  expect(await svgResponse.text()).toContain('fill="#F2C230"');

  const ico = await head.locator('link[rel="icon"][href^="/favicon.ico"]').getAttribute("href");
  const icoBody = await (await request.get(ico ?? "")).body();
  expect(icoBody.readUInt16LE(2)).toBe(1);
  expect(icoBody.readUInt16LE(4)).toBe(3);

  const apple = await head.locator('link[rel="apple-touch-icon"]').getAttribute("href");
  expect(await pngSize(request, apple ?? "")).toEqual({ width: 180, height: 180 });
});

test("the manifest icons exist at the sizes they claim, including a maskable one", async ({ page, request }) => {
  await page.goto("/");
  const href = await page.locator('link[rel="manifest"]').getAttribute("href");
  const { icons } = (await (await request.get(href ?? "")).json()) as { icons: { src: string; sizes: string; purpose: string }[] };
  expect(icons.map((icon) => icon.purpose)).toEqual(["any", "any", "maskable"]);
  for (const icon of icons) {
    const [width, height] = icon.sizes.split("x").map(Number);
    expect(await pngSize(request, icon.src)).toEqual({ width, height });
  }
});

test("the header logo shows the same pin and door mark", async ({ page }) => {
  await page.goto("/");
  const home = page.getByRole("banner").getByRole("link", { name: "AksesBogor, ke Beranda" });
  await expect(home.locator('svg[aria-hidden="true"] path')).toHaveCount(3);
});
