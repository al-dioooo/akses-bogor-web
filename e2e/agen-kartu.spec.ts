import type { Browser, BrowserContextOptions, Page } from "@playwright/test";
import { mockApi, signIn, uniqueEmail } from "./akun-masuk";
import { blockingViolations } from "./axe";
import { stubGoogle } from "./google";
import { expect, stubMapbox, test } from "./mapbox";

// Kartu, titik awal, tujuan, dan alat kontributor di Agen AI (ADR-0054), dengan API tiruan (e2e/mock-api/tanya-rute.mjs
// dan agen-rute.mjs) dan Mapbox tiruan.
const PAGE = "/agen";
const HALTE = "4037ba19-b366-45bc-aceb-270944fe9372";
/** IP yang membuat API tiruan menjawab agen kontributor belum dibuka. */
const AGENT_OFF_IP = "203.0.113.250";
const DEVICE = { latitude: -6.5965, longitude: 106.7972 };
const main = (page: Page) => page.getByRole("main");
const field = (page: Page) => main(page).getByRole("textbox", { name: "Pertanyaan untuk Agen AI" });
const conversation = (page: Page) => main(page).getByRole("list", { name: "Percakapan dengan Agen AI" });
let ipCount = 0;
/** IP tiruan yang unik per worker, supaya permintaan terakhir di API tiruan tidak tertukar antartes yang berjalan bersamaan. */
const nextIp = () => `198.18.${test.info().workerIndex % 250}.${1 + (ipCount++ % 250)}`;

async function open(browser: Browser, path = PAGE, options: BrowserContextOptions & { ip?: string; signedIn?: boolean } = {}) {
  const { ip = nextIp(), signedIn = false, ...contextOptions } = options;
  const context = await browser.newContext({ ...contextOptions, extraHTTPHeaders: { "x-forwarded-for": ip } });
  const page = await context.newPage();
  await stubMapbox(page);
  if (signedIn) {
    await stubGoogle(page);
    await signIn(page, uniqueEmail("lama", test.info().project.name), `/masuk?kembali=${encodeURIComponent(path)}`);
    await expect(page).toHaveURL(path);
  } else {
    await page.goto(path);
  }
  return { page, ip };
}

async function ask(page: Page, question: string) {
  await field(page).fill(question);
  await field(page).press("Enter");
}

const lastSent = async (page: Page, ip: string) => (await (await page.request.get(`${mockApi()}/_tiruan/asisten-terakhir?ip=${ip}`)).json()).body;

test("a visitor chooses the start point in a dialog; it goes with the question and the route card uses it", async ({ browser }) => {
  const { page, ip } = await open(browser, PAGE, { geolocation: DEVICE, permissions: ["geolocation"] });
  await main(page).getByRole("button", { name: "Pilih titik awal", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Titik awal" });
  await expect(dialog.getByText(/tidak pernah dikirim ke model AI/)).toBeVisible();
  await dialog.getByRole("button", { name: "Pakai lokasi saya" }).click();
  await expect(dialog).toBeHidden();
  const chip = main(page).getByRole("button", { name: "Titik awal: Dari lokasi Anda" });
  await expect(chip).toBeFocused();

  await ask(page, "Rute ke rumah sakit terdekat dari sini");
  await expect(conversation(page)).toContainText("Halte contoh berstatus Sebagian");
  expect(await lastSent(page, ip)).toEqual({ question: "Rute ke rumah sakit terdekat dari sini", history: [], from: { lat: DEVICE.latitude, lng: DEVICE.longitude } });
  const route = conversation(page).getByRole("region", { name: "Rute jalan kaki ke Halte contoh", exact: true });
  await expect(route.getByText("Belum tentu bisa dilewati kursi roda")).toBeVisible();
  await expect(route.getByRole("button", { name: "Pakai lokasi saya" })).toHaveCount(0);
  await expect(route.getByRole("region", { name: "Langkah" }).getByRole("listitem")).toHaveCount(3);
  await expect(route.getByRole("region", { name: "Hambatan yang tercatat di OpenStreetMap" }).getByRole("listitem")).toHaveCount(2);

  // Titik awal tidak ikut tersimpan: setelah muat ulang, kartu rute meminta titik awal lagi.
  await page.reload();
  await expect(main(page).getByRole("button", { name: "Pilih titik awal", exact: true })).toBeVisible();
  await expect(route.getByRole("button", { name: "Pakai lokasi saya" })).toBeVisible();
  expect(await page.evaluate(() => sessionStorage.getItem("aksesbogor.agen-ai"))).not.toMatch(/-6\.59|106\.79/);
  await page.context().close();
});

test("a visitor picks the start point on the map when the location is denied, and clears it", async ({ browser }) => {
  const { page, ip } = await open(browser);
  const chip = main(page).getByRole("button", { name: "Pilih titik awal", exact: true });
  await chip.click();
  const dialog = page.getByRole("dialog", { name: "Titik awal" });
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(chip).toBeFocused();

  await chip.click();
  await dialog.getByRole("button", { name: "Pakai lokasi saya" }).click();
  await expect(dialog.getByRole("alert")).toHaveText("Izin lokasi ditolak. Pilih titik awal di peta.");
  await expect(dialog.getByRole("heading", { name: "Pilih titik awal di peta" })).toBeFocused();
  await dialog.getByRole("button", { name: "Geser peta ke utara" }).click();
  await dialog.getByRole("button", { name: "Pakai titik ini" }).click();
  const chosen = main(page).getByRole("button", { name: "Titik awal: Dari titik di peta" });
  await expect(chosen).toBeFocused();
  await ask(page, "Bagaimana cara ke halte?");
  await expect(conversation(page).getByRole("region", { name: "Rute jalan kaki ke Halte contoh", exact: true }).getByText(/menit jalan kaki/)).toBeVisible();
  expect((await lastSent(page, ip)).from).toEqual({ lat: expect.any(Number), lng: expect.any(Number) });

  await chosen.click();
  await dialog.getByRole("button", { name: "Hapus titik awal" }).click();
  await expect(main(page).getByRole("button", { name: "Pilih titik awal", exact: true })).toBeVisible();
  await ask(page, "Halte mana yang ada?");
  await expect(conversation(page).getByText("Halte contoh berstatus Sebagian")).toHaveCount(2);
  expect(await lastSent(page, ip)).not.toHaveProperty("from");
  await page.context().close();
});

test("a place from Tanya rute ke sini is sent with each question until the visitor clears it", async ({ browser }) => {
  const { page, ip } = await open(browser, `${PAGE}?tempat=${HALTE}`);
  await expect(main(page).getByText("Tujuan: Halte contoh")).toBeVisible();
  await main(page).getByRole("button", { name: "Bagaimana cara ke Halte contoh?" }).click();
  await expect(conversation(page)).toContainText("Halte contoh berstatus Sebagian");
  expect((await lastSent(page, ip)).placeId).toBe(HALTE);
  // Tanpa titik awal di halaman, kartu rute meminta titik awalnya sendiri.
  await expect(conversation(page).getByRole("region", { name: "Rute jalan kaki ke Halte contoh", exact: true }).getByRole("button", { name: "Pakai lokasi saya" })).toBeVisible();

  await main(page).getByRole("button", { name: "Hapus tujuan Halte contoh" }).click();
  await expect(main(page).getByText("Tujuan: Halte contoh")).toHaveCount(0);
  await expect(page).toHaveURL(/\/agen$/);
  await expect(field(page)).toBeFocused();
  await ask(page, "Masjid terdekat yang aksesibel");
  await expect(conversation(page).getByText("Halte contoh berstatus Sebagian")).toHaveCount(2);
  expect(await lastSent(page, ip)).not.toHaveProperty("placeId");

  const { page: unknown } = await open(browser, `${PAGE}?tempat=00000000-0000-4000-8000-000000000000`);
  await expect(field(unknown)).toBeVisible();
  await expect(main(unknown).getByText(/^Tujuan:/)).toHaveCount(0);
  await unknown.context().close();
  await page.context().close();
});

test("a route to an OpenStreetMap candidate says there is no team data yet and links to Laporkan", async ({ browser }) => {
  const { page } = await open(browser, PAGE, { geolocation: DEVICE, permissions: ["geolocation"] });
  await main(page).getByRole("button", { name: "Pilih titik awal", exact: true }).click();
  await page.getByRole("dialog", { name: "Titik awal" }).getByRole("button", { name: "Pakai lokasi saya" }).click();
  await expect(page.getByRole("dialog", { name: "Titik awal" })).toBeHidden();
  await ask(page, "Bagaimana cara ke Masjid Al-Hidayah?");
  await expect(conversation(page).getByText("Belum ada data", { exact: true })).toBeVisible();
  await expect(conversation(page).getByText("Tempat ini dari OpenStreetMap dan belum punya data aksesibilitas dari tim AksesBogor.")).toBeVisible();
  await expect(conversation(page).getByRole("link", { name: "Laporkan tempat ini" })).toHaveAttribute("href", "/laporkan?osm=node%2F9001&nama=Masjid+Al-Hidayah");
  const route = conversation(page).getByRole("region", { name: "Rute jalan kaki ke Masjid Al-Hidayah", exact: true });
  await expect(route.getByRole("region", { name: "Langkah" }).getByRole("listitem")).toHaveCount(3);
  await page.context().close();
});

test("signed-in contributors get contributor suggestions and the priority, place and route cards", async ({ browser }) => {
  const { page } = await open(browser, PAGE, { signedIn: true });
  await expect(main(page).getByText(/Karena Anda masuk, Agen AI juga bisa mencari tempat yang belum punya data/)).toBeVisible();
  await main(page).getByRole("button", { name: "Kecamatan mana yang paling perlu didata?" }).click();
  const cards = conversation(page).getByRole("list", { name: "Kartu dari jawaban Agen AI" });
  const rows = cards.getByRole("table").getByRole("row");
  await expect(rows.nth(1)).toContainText("Bogor Barat");
  await expect(rows.nth(1)).toContainText("Sangat tinggi");
  await expect(cards.getByText(/bukan jumlah seluruh penduduk/)).toBeVisible();
  const osm = cards.getByRole("article", { name: "Masjid Al-Hidayah" });
  await expect(osm.getByText("Belum ada data")).toBeVisible();
  await expect(osm.getByRole("link", { name: "Laporkan tempat ini" })).toHaveAttribute("href", "/laporkan?osm=node%2F9001&nama=Masjid+Al-Hidayah");
  await expect(osm.getByRole("link", { name: "Lihat di OpenStreetMap" })).toHaveAttribute("href", "https://www.openstreetmap.org/node/9001");
  // Kartu tempat sudah menawarkan Laporkan, jadi kartu rute ke tempat yang sama tidak mengulanginya.
  await expect(cards.getByRole("link", { name: "Laporkan tempat ini" })).toHaveCount(1);
  await expect(cards.getByRole("article", { name: "Halte contoh" }).getByText("Sebagian")).toBeVisible();
  const route = cards.getByRole("region", { name: "Rute jalan kaki ke Masjid Al-Hidayah", exact: true });
  await expect(route.getByRole("button", { name: "Pakai lokasi saya" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  // Hanya percakapan yang digulir; halaman yang dikunci tetap di atas, jadi judul Agen AI tidak tertutup header.
  expect(await page.evaluate(() => document.scrollingElement!.scrollTop)).toBe(0);
  await expect(main(page).getByRole("heading", { level: 1, name: "Agen AI" })).toBeInViewport();
  await page.context().close();
});

test("signed-in accounts get no contributor suggestions while the contributor agent is off", async ({ browser }) => {
  const { page } = await open(browser, PAGE, { signedIn: true, ip: AGENT_OFF_IP });
  await expect(field(page)).toBeVisible();
  await expect(main(page).getByRole("button", { name: "Kecamatan mana yang paling perlu didata?" })).toHaveCount(0);
  await expect(main(page).getByText(/Karena Anda masuk/)).toHaveCount(0);
  await page.context().close();
});

for (const colorScheme of ["light", "dark"] as const) {
  test(`Agen AI with cards and the start point dialog has no serious or critical WCAG 2.2 AA violations (${colorScheme})`, async ({ browser }) => {
    const { page } = await open(browser, PAGE, { signedIn: true, geolocation: DEVICE, permissions: ["geolocation"] });
    await page.emulateMedia({ colorScheme, reducedMotion: "reduce" });
    await main(page).getByRole("button", { name: "Pilih titik awal", exact: true }).click();
    await expect(page.getByRole("dialog", { name: "Titik awal" })).toBeVisible();
    expect(await blockingViolations(page)).toEqual([]);
    await page.getByRole("dialog", { name: "Titik awal" }).getByRole("button", { name: "Pakai lokasi saya" }).click();
    await expect(page.getByRole("dialog", { name: "Titik awal" })).toBeHidden();
    await ask(page, "Masjid mana yang belum didata?");
    const route = conversation(page).getByRole("region", { name: "Rute jalan kaki ke Masjid Al-Hidayah", exact: true });
    await expect(route.getByRole("region", { name: "Hambatan yang tercatat di OpenStreetMap" }).getByRole("listitem")).toHaveCount(2);
    expect(await blockingViolations(page)).toEqual([]);
    await page.context().close();
  });
}
