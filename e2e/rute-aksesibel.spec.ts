import type { Browser, Page } from "@playwright/test";
import { mockApi } from "./akun-masuk";
import { blockingViolations } from "./axe";
import { expect, stubMapbox, test } from "./mapbox";

// Rute OpenStreetMap di kartu rute (ADR-0055) dengan API tiruan e2e/mock-api/rute-aksesibel.mjs: hanya IP 192.0.2.x
// yang mendapat rute OSM, IP lain mendapat 503 rute_aksesibel_belum_aktif dan rute Mapbox tiruan. Kartu rute dibuka
// lewat Agen AI (ADR-0054), yang menggantikan Tanya rute; bila halaman itu dipindah, cukup ganti `routeCard`.
const HALTE = "4037ba19-b366-45bc-aceb-270944fe9372";
const DEVICE = { latitude: -6.5965, longitude: 106.7972 };
/** Titik awal yang membuat API tiruan menjawab tidak ada rute kursi roda. */
const NO_PATH = { latitude: -6.61, longitude: 106.81 };
const NOTE = "Dihitung dari data OpenStreetMap; kondisi lapangan bisa berbeda.";
const from = { lat: DEVICE.latitude, lng: DEVICE.longitude };
let ipCount = 0;
const onIp = () => `192.0.2.${10 + (ipCount++ % 200)}`;
const sent = async (page: Page, ip: string) => (await (await page.request.get(`${mockApi()}/_tiruan/rute-aksesibel-terakhir?ip=${ip}`)).json()).body;

/** Kartu rute ke Halte contoh dari lokasi perangkat, lewat Agen AI. */
async function routeCard(browser: Browser, ip: string, { geolocation = DEVICE, colorScheme = "light" as "light" | "dark" } = {}) {
  const context = await browser.newContext({
    geolocation,
    permissions: ["geolocation"],
    extraHTTPHeaders: { "x-forwarded-for": ip },
    colorScheme,
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  await stubMapbox(page);
  await page.goto("/agen");
  const main = page.getByRole("main");
  await main.getByRole("button", { name: "Pilih titik awal", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Titik awal" });
  await dialog.getByRole("button", { name: "Pakai lokasi saya" }).click();
  await expect(dialog).toBeHidden();
  // Saran pertanyaan langsung terkirim.
  await main.getByRole("button", { name: "Rute ke rumah sakit terdekat dari sini" }).click();
  return { page, card: main.getByRole("region", { name: "Rute jalan kaki ke Halte contoh", exact: true }) };
}

test("the route card shows the wheelchair route from OpenStreetMap, its data coverage and warnings, and switches to walking", async ({ browser }) => {
  const ip = onIp();
  const { page, card } = await routeCard(browser, ip);
  await expect(card.getByText(/menit dengan kursi roda/)).toBeFocused();
  await expect(card.getByRole("button", { name: "Kursi roda", pressed: true })).toBeVisible();
  await expect(card.getByText(NOTE)).toBeVisible();
  await expect(card.getByText("Belum tentu bisa dilewati kursi roda")).toHaveCount(0);
  const coverage = card.getByRole("region", { name: "Kelengkapan data di rute ini" });
  await expect(coverage.getByRole("listitem")).toHaveText([
    "Trotoar atau jalur pejalan kaki tercatat di 62% panjang rute",
    "Jenis permukaan tercatat di 18% panjang rute",
    "Kerb tercatat di 1 dari 3 penyeberangan",
  ]);
  await expect(card.getByRole("region", { name: "Perlu diperhatikan" }).getByRole("listitem")).toHaveCount(2);
  await expect(card.getByRole("region", { name: "Langkah" }).getByRole("listitem")).toHaveCount(3);
  await expect(card.getByRole("region", { name: "Hambatan yang tercatat di OpenStreetMap" }).getByRole("listitem")).toHaveCount(2);
  // Titik awal hanya ke API lewat server web, dibulatkan di API.
  expect(await sent(page, ip)).toEqual({ from, placeId: HALTE, profil: "kursi_roda" });
  expect(await blockingViolations(page)).toEqual([]);

  await card.getByRole("button", { name: "Jalan kaki" }).click();
  await expect(card.getByText(/menit jalan kaki/)).toBeFocused();
  await expect(card.getByRole("button", { name: "Jalan kaki", pressed: true })).toBeVisible();
  await expect(card.getByText("Rute ini melewati tangga sekitar 20 m.")).toBeVisible();
  expect((await sent(page, ip)).profil).toBe("jalan_kaki");
});

test("the OpenStreetMap route card has no serious or critical WCAG 2.2 AA violations in dark mode", async ({ browser }) => {
  const { page, card } = await routeCard(browser, onIp(), { colorScheme: "dark" });
  await expect(card.getByRole("region", { name: "Perlu diperhatikan" })).toBeVisible();
  await expect(card.getByRole("region", { name: "Hambatan yang tercatat di OpenStreetMap" }).getByRole("listitem")).toHaveCount(2);
  expect(await blockingViolations(page)).toEqual([]);
});

test("the route card offers the walking route when no wheelchair path is found", async ({ browser }) => {
  const { card } = await routeCard(browser, onIp(), { geolocation: NO_PATH });
  await expect(card.getByRole("alert")).toContainText("Tidak ditemukan rute tanpa tangga");
  await card.getByRole("button", { name: "Lihat rute jalan kaki" }).click();
  await expect(card.getByText(/menit jalan kaki/)).toBeVisible();
  await expect(card.getByRole("button", { name: "Jalan kaki", pressed: true })).toBeVisible();
});

test("the route card keeps the Mapbox route and its warning while the API has no OpenStreetMap route", async ({ browser }) => {
  const { card } = await routeCard(browser, "198.51.100.232");
  await expect(card.getByText("Belum tentu bisa dilewati kursi roda")).toBeVisible();
  await expect(card.getByRole("group", { name: "Profil rute" })).toHaveCount(0);
  await expect(card.getByText(NOTE)).toHaveCount(0);
});
