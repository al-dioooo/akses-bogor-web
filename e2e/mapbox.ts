// Peta memuat gaya dan tile dari Mapbox. Supaya tes tidak bergantung pada internet dan akun Mapbox, semua request ke
// *.mapbox.com dicegat: gaya peta diganti latar polos dan request lain dijawab kosong. Token dari API tiruan palsu.
import { expect, test as base, type Page } from "@playwright/test";

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

/**
 * Membuka panel daftar Peta. Di ponsel lembar bawah mulai kecil dan dibuka dengan tombol Daftar; mulai 768 px panel
 * samping sudah terbuka dari awal.
 */
export async function openList(page: Page) {
  const toggle = page.getByRole("main").getByRole("button", { name: /^Tampilkan (daftar|peta)$/ });
  if ((page.viewportSize()?.width ?? 0) < 768) await page.getByRole("button", { name: "Tampilkan daftar" }).click();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
}

export { expect };
