// Tombol Google Identity Services tiruan. Tes tidak memuat skrip Google: skrip diganti tombol biasa yang memanggil
// callback dengan credential tiruan, yang diterima API tiruan (e2e/mock-api/akun.mjs).
import type { Page } from "@playwright/test";

const SCRIPT = /^https:\/\/accounts\.google\.com\/gsi\/client/;

export async function stubGoogle(page: Page, credential = "tiruan-google") {
  await page.route(SCRIPT, (route) =>
    route.fulfill({
      contentType: "text/javascript",
      body: `window.google = { accounts: { id: {
        initialize(options) { window.__gis = options; },
        renderButton(parent, options) {
          window.__gisButton = options;
          const button = document.createElement("button");
          button.type = "button";
          button.textContent = "Masuk dengan Google";
          button.style.minHeight = "44px";
          button.onclick = () => window.__gis.callback({ credential: ${JSON.stringify(credential)} });
          parent.appendChild(button);
        },
      } } };`,
    }),
  );
}

/** Skrip Google gagal dimuat, mis. diblokir jaringan atau ekstensi. */
export async function blockGoogle(page: Page) {
  await page.route(SCRIPT, (route) => route.abort());
}
