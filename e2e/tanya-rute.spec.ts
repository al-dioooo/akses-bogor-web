import type { Browser, Page } from "@playwright/test";
import { mockApi } from "./akun-masuk";
import { blockingViolations } from "./axe";
import { expect, stubMapbox, test } from "./mapbox";

// Tanya rute (ADR-0050) tanpa akun, dengan API tiruan (e2e/mock-api/tanya-rute.mjs dan agen-rute.mjs) dan Mapbox tiruan.
const PAGE = "/tanya-rute";
const HALTE = "4037ba19-b366-45bc-aceb-270944fe9372";
/** IP pengunjung yang membuat API tiruan menjawab asisten belum dibuka. */
const ASSISTANT_OFF_IP = "203.0.113.247";
const DEVICE = { latitude: -6.5965, longitude: 106.7972 };
const main = (page: Page) => page.getByRole("main");
let ipCount = 0;

/** Halaman baru tanpa akun dari IP sendiri, dengan lokasi perangkat bila diberikan. */
async function openVisitor(browser: Browser, path = PAGE, options: { geolocation?: typeof DEVICE; ip?: string } = {}) {
  const ip = options.ip ?? `198.51.100.${100 + (ipCount++ % 100)}`;
  const context = await browser.newContext({
    ...(options.geolocation ? { geolocation: options.geolocation, permissions: ["geolocation"] } : {}),
    extraHTTPHeaders: { "x-forwarded-for": ip },
  });
  const page = await context.newPage();
  await stubMapbox(page);
  await page.goto(path);
  return { page, ip };
}

async function ask(page: Page, question: string) {
  await main(page).getByRole("textbox", { name: "Pertanyaan Anda" }).fill(question);
  await main(page).getByRole("button", { name: "Kirim pertanyaan" }).click();
}

const lastSent = async (page: Page, ip: string) => (await (await page.request.get(`${mockApi()}/_tiruan/asisten-terakhir?ip=${ip}`)).json()).body;

test("Beranda, the footer, the Lainnya menu and place pages lead to Tanya rute", async ({ page, isMobile }) => {
  await stubMapbox(page);
  await page.goto("/");
  await main(page).getByRole("link", { name: "Tanya cara ke sebuah tempat" }).click();
  await expect(page).toHaveURL(/\/tanya-rute$/);
  await expect(main(page).getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("contentinfo").getByRole("link", { name: "Tanya rute", exact: true })).toHaveAttribute("href", "/tanya-rute");
  if (isMobile) {
    await page.getByRole("button", { name: "Lainnya" }).click();
    await expect(page.locator("#menu-lainnya").getByRole("link", { name: "Tanya rute", exact: true })).toHaveAttribute("href", "/tanya-rute");
  }

  await page.goto(`/lokasi/${HALTE}`);
  const toPlace = main(page).getByRole("link", { name: "Tanya rute ke sini" });
  await expect(toPlace).toHaveAttribute("href", `/tanya-rute?tempat=${HALTE}`);
  await toPlace.click();
  await expect(main(page).getByText("Tujuan: Halte contoh")).toBeVisible();
});

test("visitors without an account ask with their device location and get the route card drawn from it", async ({ browser }) => {
  const { page, ip } = await openVisitor(browser, PAGE, { geolocation: DEVICE });
  await expect(main(page).getByRole("heading", { level: 1, name: "Tanya cara ke tempat di Kota Bogor" })).toBeVisible();
  await expect(main(page).getByText(/dikirim lewat server AksesBogor ke Anthropic \(Claude API\)/)).toBeVisible();
  await expect(main(page).getByRole("link", { name: "Kebijakan Privasi" })).toHaveAttribute("href", "/kebijakan-privasi");

  const start = main(page).getByRole("region", { name: "Titik awal" });
  await expect(start.getByText(/tidak pernah dikirim ke asisten AI/)).toBeVisible();
  await start.getByRole("button", { name: "Pakai lokasi saya" }).click();
  await expect(start.getByText("Titik awal: lokasi perangkat Anda.")).toBeFocused();

  await main(page).getByRole("button", { name: "Rute ke rumah sakit terdekat dari sini" }).click();
  await main(page).getByRole("button", { name: "Kirim pertanyaan" }).click();
  const conversation = main(page).getByRole("list", { name: "Percakapan dengan asisten" });
  await expect(conversation).toContainText("Halte contoh berstatus Sebagian");
  await expect(conversation.getByRole("link", { name: /Data terverifikasi AksesBogor: Halte contoh/ })).toHaveAttribute("href", `/lokasi/${HALTE}`);
  expect(await lastSent(page, ip)).toEqual({ question: "Rute ke rumah sakit terdekat dari sini", history: [], from: { lat: DEVICE.latitude, lng: DEVICE.longitude } });

  const route = conversation.getByRole("region", { name: "Rute jalan kaki ke Halte contoh", exact: true });
  await expect(route.getByText("Belum tentu bisa dilewati kursi roda")).toBeVisible();
  await expect(route.getByRole("button", { name: "Pakai lokasi saya" })).toHaveCount(0);
  await expect(route.getByRole("region", { name: "Langkah" }).getByRole("listitem")).toHaveCount(3);
  await expect(route.getByRole("region", { name: "Hambatan yang tercatat di OpenStreetMap" }).getByRole("listitem")).toHaveCount(2);
  await page.context().close();
});

test("visitors pick the start point on the map when the location is denied", async ({ browser }) => {
  const { page, ip } = await openVisitor(browser);
  const start = main(page).getByRole("region", { name: "Titik awal" });
  await start.getByRole("button", { name: "Pakai lokasi saya" }).click();
  await expect(start.getByRole("alert")).toHaveText("Izin lokasi ditolak. Pilih titik awal di peta.");
  await expect(start.getByRole("heading", { name: "Pilih titik awal di peta" })).toBeFocused();
  await start.getByRole("button", { name: "Geser peta ke utara" }).click();
  await start.getByRole("button", { name: "Pakai titik ini" }).click();
  await expect(start.getByText("Titik awal: titik yang Anda pilih di peta.")).toBeFocused();

  await ask(page, "Bagaimana cara ke halte?");
  const route = main(page).getByRole("region", { name: "Rute jalan kaki ke Halte contoh", exact: true });
  await expect(route.getByText(/menit jalan kaki/)).toBeFocused();
  expect((await lastSent(page, ip)).from).toEqual({ lat: expect.any(Number), lng: expect.any(Number) });

  await start.getByRole("button", { name: "Hapus titik awal" }).click();
  await expect(start.getByRole("button", { name: "Pakai lokasi saya" })).toBeVisible();
  await ask(page, "Halte mana yang ada?");
  await expect(main(page).getByRole("list", { name: "Percakapan dengan asisten" }).locator(":scope > li")).toHaveCount(4);
  expect(await lastSent(page, ip)).not.toHaveProperty("from");
  await page.context().close();
});

test("a place from Tanya rute ke sini is chosen until the visitor clears it", async ({ browser }) => {
  const { page, ip } = await openVisitor(browser, `${PAGE}?tempat=${HALTE}`);
  await expect(main(page).getByText("Tujuan: Halte contoh")).toBeVisible();
  await main(page).getByRole("button", { name: "Bagaimana cara ke Halte contoh?" }).click();
  await main(page).getByRole("button", { name: "Kirim pertanyaan" }).click();
  await expect(main(page).getByRole("list", { name: "Percakapan dengan asisten" })).toContainText("Halte contoh berstatus Sebagian");
  expect((await lastSent(page, ip)).placeId).toBe(HALTE);

  // Kartu rute tanpa titik awal di halaman menanyakan titik awalnya sendiri.
  const route = main(page).getByRole("region", { name: "Rute jalan kaki ke Halte contoh", exact: true });
  await expect(route.getByRole("button", { name: "Pakai lokasi saya" })).toBeVisible();

  await main(page).getByRole("button", { name: "Hapus tujuan" }).click();
  await expect(main(page).getByRole("textbox", { name: "Pertanyaan Anda" })).toBeFocused();
  await ask(page, "Masjid terdekat yang aksesibel");
  await expect(main(page).getByRole("list", { name: "Percakapan dengan asisten" }).locator(":scope > li")).toHaveCount(4);
  expect(await lastSent(page, ip)).not.toHaveProperty("placeId");

  const { page: unknown } = await openVisitor(browser, `${PAGE}?tempat=00000000-0000-4000-8000-000000000000`);
  await expect(main(unknown).getByRole("textbox", { name: "Pertanyaan Anda" })).toBeVisible();
  await expect(main(unknown).getByText(/^Tujuan:/)).toHaveCount(0);
  await unknown.context().close();
  await page.context().close();
});

test("shows the quota and busy messages from the API and keeps the question", async ({ browser }) => {
  const { page } = await openVisitor(browser);
  await ask(page, "kuota-tiruan, rute ke halte?");
  await expect(main(page).getByRole("alert")).toHaveText("Jatah 5 pertanyaan hari ini sudah habis. Coba lagi besok, atau masuk untuk memakai jatah akun Anda.");
  await expect(main(page).getByRole("textbox", { name: "Pertanyaan Anda" })).toHaveValue("kuota-tiruan, rute ke halte?");
  await ask(page, "sibuk-tiruan");
  await expect(main(page).getByRole("alert")).toHaveText("Asisten sedang sibuk. Coba lagi nanti.");
  await page.context().close();
});

test("says Tanya rute is not open yet while the API keeps it off", async ({ browser }) => {
  const { page } = await openVisitor(browser, PAGE, { ip: ASSISTANT_OFF_IP });
  await expect(main(page).getByText("Tanya rute belum dibuka")).toBeVisible();
  await expect(main(page).getByRole("textbox", { name: "Pertanyaan Anda" })).toHaveCount(0);
  await page.context().close();
});

for (const colorScheme of ["light", "dark"] as const) {
  test(`Tanya rute has no serious or critical WCAG 2.2 AA violations (${colorScheme})`, async ({ browser }) => {
    const { page } = await openVisitor(browser, `${PAGE}?tempat=${HALTE}`, { geolocation: DEVICE });
    await page.emulateMedia({ colorScheme, reducedMotion: "reduce" });
    await expect(main(page).getByRole("textbox", { name: "Pertanyaan Anda" })).toBeVisible();
    expect(await blockingViolations(page)).toEqual([]);
    await main(page).getByRole("region", { name: "Titik awal" }).getByRole("button", { name: "Pakai lokasi saya" }).click();
    await ask(page, "Bagaimana cara ke Halte contoh?");
    const route = main(page).getByRole("region", { name: "Rute jalan kaki ke Halte contoh", exact: true });
    await expect(route.getByRole("region", { name: "Hambatan yang tercatat di OpenStreetMap" }).getByRole("listitem")).toHaveCount(2);
    expect(await blockingViolations(page)).toEqual([]);
    await ask(page, "kuota-tiruan");
    await expect(main(page).getByRole("alert")).toBeVisible();
    expect(await blockingViolations(page)).toEqual([]);
    await page.context().close();
  });
}

test("a route to an OpenStreetMap candidate says there is no team data yet and links to Laporkan", async ({ browser }) => {
  const { page } = await openVisitor(browser, PAGE, { geolocation: DEVICE });
  const start = main(page).getByRole("region", { name: "Titik awal" });
  await start.getByRole("button", { name: "Pakai lokasi saya" }).click();
  await ask(page, "Bagaimana cara ke Masjid Al-Hidayah?");
  const conversation = main(page).getByRole("list", { name: "Percakapan dengan asisten" });
  await expect(conversation.getByText("Belum ada data", { exact: true })).toBeVisible();
  await expect(conversation.getByText("Tempat ini dari OpenStreetMap dan belum punya data aksesibilitas dari tim AksesBogor.")).toBeVisible();
  await expect(conversation.getByRole("link", { name: "Laporkan tempat ini" })).toHaveAttribute("href", "/laporkan?osm=node%2F9001&nama=Masjid+Al-Hidayah");
  const route = conversation.getByRole("region", { name: "Rute jalan kaki ke Masjid Al-Hidayah", exact: true });
  await expect(route.getByRole("region", { name: "Langkah" }).getByRole("listitem")).toHaveCount(3);
  expect(await blockingViolations(page)).toEqual([]);
});
