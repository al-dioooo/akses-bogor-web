import type { Browser, Page } from "@playwright/test";
import { signIn, uniqueEmail } from "./akun-masuk";
import { blockingViolations } from "./axe";
import { stubGoogle } from "./google";
import { expect, stubMapbox, test } from "./mapbox";

// Bantu memetakan (FR-60, ADR-0043) dengan API tiruan (e2e/mock-api/agen-rute.mjs) dan Mapbox tiruan.
const PAGE = "/laporkan/bantu-memetakan";
/** IP pengunjung yang membuat API tiruan menjawab agen_rute_belum_aktif. */
const AGENT_OFF_IP = "203.0.113.250";
const main = (page: Page) => page.getByRole("main");

/** Halaman baru dengan akun lengkap yang sudah masuk, dan lokasi perangkat bila diberikan. */
export async function openSignedIn(browser: Browser, from: string, options: { geolocation?: { latitude: number; longitude: number }; ip?: string } = {}) {
  const context = await browser.newContext({
    ...(options.geolocation ? { geolocation: options.geolocation, permissions: ["geolocation"] } : {}),
    ...(options.ip ? { extraHTTPHeaders: { "x-forwarded-for": options.ip } } : {}),
  });
  const page = await context.newPage();
  await stubMapbox(page);
  await stubGoogle(page);
  await signIn(page, uniqueEmail("lama", test.info().project.name), `/masuk?kembali=${encodeURIComponent(from)}`);
  await expect(page).toHaveURL(from);
  return page;
}

async function ask(page: Page, question: string) {
  await main(page).getByRole("textbox", { name: "Pertanyaan Anda" }).fill(question);
  await main(page).getByRole("button", { name: "Kirim pertanyaan" }).click();
}

test("signed-in contributors reach Bantu memetakan from Laporkan and get an answer with its sources", async ({ browser }) => {
  const page = await openSignedIn(browser, "/laporkan");
  await main(page).getByRole("link", { name: "Bantu memetakan" }).click();
  await expect(page).toHaveURL(PAGE);
  await expect(main(page).getByRole("heading", { level: 1, name: "Cari tempat yang belum punya data" })).toBeVisible();
  await expect(main(page).getByText(/Jangan tulis data pribadi/)).toBeVisible();

  // Contoh pertanyaan yang panjang turun baris dan tetap di dalam panelnya.
  for (const example of await main(page).getByRole("group", { name: "Contoh pertanyaan" }).getByRole("button").all()) {
    expect(await example.evaluate((button) => button.getBoundingClientRect().right <= button.closest("section")!.getBoundingClientRect().right)).toBe(true);
  }
  await main(page).getByRole("button", { name: "Kecamatan mana yang paling perlu didata?" }).click();
  await expect(main(page).getByRole("textbox", { name: "Pertanyaan Anda" })).toHaveValue("Kecamatan mana yang paling perlu didata?");
  await main(page).getByRole("button", { name: "Kirim pertanyaan" }).click();
  const conversation = main(page).getByRole("list", { name: "Percakapan dengan agen" });
  await expect(conversation).toContainText("Bogor Barat paling diprioritaskan.");
  await expect(conversation).toContainText("Data aksesibilitas untuk tempat itu belum tersedia");
  await expect(conversation.getByRole("link", { name: /Data terverifikasi AksesBogor: Halte contoh/ })).toHaveAttribute("href", "/lokasi/4037ba19-b366-45bc-aceb-270944fe9372");
  await expect(conversation.getByText("Lisensi ODbL 1.0 · © kontributor OpenStreetMap")).toBeVisible();
  await expect(main(page).getByRole("textbox", { name: "Pertanyaan Anda" })).toHaveValue("");
  await page.context().close();
});

test("keeps the question and says the agent is busy", async ({ browser }) => {
  const page = await openSignedIn(browser, PAGE);
  await ask(page, "sibuk-tiruan, masjid mana yang belum didata?");
  await expect(main(page).getByRole("alert")).toHaveText("Agen sedang sibuk, coba lagi nanti.");
  await expect(main(page).getByRole("textbox", { name: "Pertanyaan Anda" })).toHaveValue("sibuk-tiruan, masjid mana yang belum didata?");
  await ask(page, "batas-tiruan");
  await expect(main(page).getByRole("alert")).toContainText("Batas 5 pertanyaan per hari");
  await page.context().close();
});

test("stays hidden while the API keeps the agent off", async ({ browser }) => {
  const page = await openSignedIn(browser, "/laporkan", { ip: AGENT_OFF_IP });
  await expect(main(page).getByRole("heading", { level: 1 })).toBeVisible();
  await expect(main(page).getByRole("link", { name: "Bantu memetakan" })).toHaveCount(0);
  await page.goto(PAGE);
  await expect(main(page).getByText("Bantu memetakan belum dibuka")).toBeVisible();
  await expect(main(page).getByRole("textbox", { name: "Pertanyaan Anda" })).toHaveCount(0);
  await page.context().close();
});

test("is not offered to signed-out visitors, and the page sends them to Masuk", async ({ page }) => {
  await stubGoogle(page);
  await page.goto("/laporkan");
  await expect(main(page).getByRole("heading", { level: 1 })).toBeVisible();
  await expect(main(page).getByRole("link", { name: "Bantu memetakan" })).toHaveCount(0);
  await page.goto(PAGE);
  await expect(page).toHaveURL(/\/masuk\?kembali=/);
});

for (const colorScheme of ["light", "dark"] as const) {
  test(`Bantu memetakan has no serious or critical WCAG 2.2 AA violations (${colorScheme})`, async ({ browser }) => {
    const page = await openSignedIn(browser, PAGE);
    await page.emulateMedia({ colorScheme, reducedMotion: "reduce" });
    expect(await blockingViolations(page)).toEqual([]);
    await ask(page, "Kecamatan mana yang paling perlu didata?");
    await expect(main(page).getByRole("list", { name: "Percakapan dengan agen" })).toContainText("Bogor Barat");
    expect(await blockingViolations(page)).toEqual([]);
    await ask(page, "sibuk-tiruan");
    await expect(main(page).getByRole("alert")).toBeVisible();
    expect(await blockingViolations(page)).toEqual([]);
    await page.context().close();
  });
}
