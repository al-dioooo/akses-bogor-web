import { expect, test } from "@playwright/test";
import { mockApiPort, webServerSecret } from "../playwright.config";

// Di Vercel, x-forwarded-for berisi IP pengunjung; di sini nilainya diisi tes.
const visitorIp = "198.51.100.7";
test.use({ extraHTTPHeaders: { "x-forwarded-for": visitorIp } });

test("sends the web server secret and the visitor ip to the API", async ({ page, request }) => {
  await page.goto("/");
  const res = await request.get(`http://localhost:${mockApiPort}/_tiruan/pengunjung?ip=${visitorIp}`);
  expect(await res.json()).toEqual({ secret: webServerSecret });
});
