import type { Browser, Page } from "@playwright/test";
import { mockApi } from "./akun-masuk";
import { blockingViolations } from "./axe";
import { expect, openList, stubMapbox, test } from "./mapbox";

// Petunjuk aksesibilitas dari Mapbox dan Google (ADR-0052) dengan API tiruan (e2e/mock-api/petunjuk.mjs).
const HALTE = "4037ba19-b366-45bc-aceb-270944fe9372";
const HALTE_B = "f2aeb27d-5f54-42f8-8368-780b6d62b51c";
const KAMPUS = "d947fdea-623a-408d-aa4d-30aa224a6440";
const NO_HINTS_IP = "203.0.113.247";
const TITLE = "Petunjuk dari sumber lain (belum diperiksa tim)";
const main = (page: Page) => page.getByRole("main");
const hints = (page: Page) => main(page).getByRole("region", { name: TITLE });

async function visitor(browser: Browser, ip: string, viewport?: { width: number; height: number }) {
  const context = await browser.newContext({ extraHTTPHeaders: { "x-forwarded-for": ip }, ...(viewport ? { viewport } : {}) });
  const page = await context.newPage();
  await stubMapbox(page);
  return { context, page };
}

/** Berapa kali API tiruan menerima permintaan petunjuk untuk IP pengunjung ini. */
const hintRequests = async (page: Page, ip: string) => {
  const response = await page.request.get(`${mockApi()}/_tiruan/petunjuk?ip=${ip}`);
  return ((await response.json()) as { count: number }).count;
};

test("the place page shows Mapbox and Google hints apart from the verified facilities, with their credits", async ({ page }) => {
  await page.goto(`/lokasi/${HALTE}`);
  const section = hints(page);
  await expect(section.getByRole("heading", { level: 3, name: TITLE })).toBeVisible();
  await expect(section.getByText("Menurut Mapbox: bisa dimasuki kursi roda")).toBeVisible();
  await expect(
    section.getByText("Menurut Google: pintu masuk ramah kursi roda · toilet: tidak diketahui · parkir tidak ramah kursi roda · tempat duduk: tidak diketahui"),
  ).toBeVisible();
  await expect(section.getByText("Dicocokkan dengan “Halte Contoh”, 12 m dari titik ini. © Mapbox")).toBeVisible();
  const google = section.getByRole("link", { name: "Google Maps (tab baru)" });
  await expect(google).toHaveAttribute("href", "https://maps.google.com/?cid=123");
  await expect(google).toHaveAttribute("target", "_blank");
  // Status dan fasilitas tetap dari data AksesBogor.
  await expect(main(page).getByText("Sebagian").first()).toBeVisible();
  expect(await section.textContent()).not.toMatch(/terverifikasi|cacat/i);
  expect(await blockingViolations(page)).toEqual([]);
});

test("the place page says when there is no hint and when hints cannot load", async ({ page }) => {
  await page.goto(`/lokasi/${KAMPUS}`);
  await expect(hints(page).getByText("Tidak ada petunjuk dari sumber lain untuk tempat ini.")).toBeVisible();
  await page.goto(`/lokasi/${HALTE_B}`);
  await expect(hints(page).getByText("Petunjuk dari sumber lain belum bisa dimuat.")).toBeVisible();
});

test("nothing is shown while hints are switched off in the API", async ({ browser }) => {
  const { context, page } = await visitor(browser, NO_HINTS_IP);
  const answered = page.waitForResponse((response) => response.url().includes("/peta/petunjuk?"));
  await page.goto(`/lokasi/${HALTE}`);
  await answered;
  await expect(main(page).getByRole("heading", { name: "Fasilitas" }).first()).toBeVisible();
  await expect(hints(page)).toHaveCount(0);
  await context.close();
});

test("Peta asks for hints only when a place or candidate card opens, never for every marker", async ({ browser }, testInfo) => {
  const ip = testInfo.project.name === "ponsel" ? "203.0.113.231" : "203.0.113.232";
  const { context, page } = await visitor(browser, ip, testInfo.project.name === "ponsel" ? undefined : { width: 1280, height: 720 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/peta");
  await expect(main(page).getByRole("group", { name: "Kontrol peta" })).toBeVisible({ timeout: 15_000 });
  await page.waitForTimeout(800);
  expect(await hintRequests(page, ip)).toBe(0);

  await openList(page);
  if ((page.viewportSize()?.width ?? 0) < 768) {
    const handle = page.getByRole("slider", { name: "Tinggi panel daftar" });
    await handle.press("ArrowUp");
    await expect(handle).toHaveAttribute("aria-valuetext", "penuh");
  }
  await main(page).getByRole("button", { name: "Tunjukkan di peta: Halte contoh", exact: true }).click();
  const card = main(page).getByRole("region", { name: "Halte contoh" });
  await expect(card.getByRole("heading", { level: 4, name: TITLE })).toBeVisible();
  await expect(card.getByText("Menurut Mapbox: bisa dimasuki kursi roda")).toBeVisible();
  // The verified status stays on the card, separate from the hints.
  await expect(card.getByText("Sebagian").first()).toBeVisible();
  expect(await hintRequests(page, ip)).toBe(1);

  await card.getByRole("button", { name: "Tutup ringkasan" }).click();
  await main(page).getByRole("button", { name: "Tunjukkan di peta: Masjid kandidat A" }).click();
  const candidate = main(page).getByRole("region", { name: "Masjid kandidat A" });
  await expect(candidate.getByText("Menurut Mapbox: bisa dimasuki kursi roda")).toBeVisible();
  // Salinan tersimpan untuk kandidat: Google Maps dengan tanggalnya, dan keterangan OSM yang berbeda dari tag di kartu.
  const candidateHints = candidate.getByRole("region", { name: TITLE });
  await expect(
    candidateHints.getByText("Menurut Google Maps (diambil 23 Nov 2026): pintu masuk ramah kursi roda · toilet: tidak diketahui · parkir: tidak diketahui · tempat duduk: tidak diketahui"),
  ).toBeVisible();
  await expect(candidateHints.getByRole("link", { name: "Google Maps (tab baru)" })).toHaveAttribute("href", "https://maps.google.com/?cid=9001");
  await expect(candidateHints.getByText("Menurut OpenStreetMap: bisa dimasuki kursi roda")).toBeVisible();
  await expect(candidateHints.getByText("© kontributor OpenStreetMap")).toBeVisible();
  await expect(candidate.getByText("Belum ada data aksesibilitas")).toBeVisible();
  expect(await hintRequests(page, ip)).toBe(2);
  expect(await blockingViolations(page)).toEqual([]);
  await context.close();
});
