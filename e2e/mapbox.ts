// Peta memuat gaya dan tile dari Mapbox. Supaya tes tidak bergantung pada internet dan akun Mapbox, semua request ke
// *.mapbox.com dicegat: gaya peta diganti latar polos dan request lain dijawab kosong. Token dari API tiruan palsu.
import { test as base, type Page } from "@playwright/test";

const STYLE = {
  version: 8,
  name: "Tiruan",
  sources: {},
  layers: [{ id: "latar", type: "background", paint: { "background-color": "#e9e7e1" } }],
};

export async function stubMapbox(page: Page) {
  await page.route(/^https:\/\/([a-z0-9-]+\.)*mapbox\.com\//, (route) => {
    const headers = { "access-control-allow-origin": "*" };
    if (route.request().url().includes("/styles/v1/")) return route.fulfill({ json: STYLE, headers });
    return route.fulfill({ status: 204, headers });
  });
}

/** `test` dengan Mapbox tiruan di setiap halaman. */
export const test = base.extend({
  page: async ({ page }, provide) => {
    await stubMapbox(page);
    await provide(page);
  },
});

export { expect } from "@playwright/test";
