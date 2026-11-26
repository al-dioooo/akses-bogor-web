import type { Browser, BrowserContextOptions, Page } from "@playwright/test";
import { mockApi } from "./akun-masuk";
import { blockingViolations } from "./axe";
import { expect, stubMapbox, test } from "./mapbox";

// Agen AI (ADR-0054) tanpa akun, dengan API tiruan (e2e/mock-api/tanya-rute.mjs dan agen-rute.mjs) dan Mapbox tiruan.
const PAGE = "/agen";
const HALTE = "4037ba19-b366-45bc-aceb-270944fe9372";
/** IP pengunjung yang membuat API tiruan menjawab asisten belum dibuka. */
const ASSISTANT_OFF_IP = "203.0.113.247";
const ANSWER = "Halte contoh berstatus Sebagian";
const main = (page: Page) => page.getByRole("main");
const field = (page: Page) => main(page).getByRole("textbox", { name: "Pertanyaan untuk Agen AI" });
const conversation = (page: Page) => main(page).getByRole("list", { name: "Percakapan dengan Agen AI" });
let ipCount = 0;
/** IP tiruan yang unik per worker, supaya permintaan terakhir di API tiruan tidak tertukar antartes yang berjalan bersamaan. */
const nextIp = () => `198.18.${100 + (test.info().workerIndex % 150)}.${1 + (ipCount++ % 250)}`;

/** Halaman baru tanpa akun dari IP sendiri. */
async function openVisitor(browser: Browser, path = PAGE, options: BrowserContextOptions & { ip?: string } = {}) {
  const { ip = nextIp(), ...contextOptions } = options;
  const context = await browser.newContext({ ...contextOptions, extraHTTPHeaders: { "x-forwarded-for": ip } });
  const page = await context.newPage();
  await stubMapbox(page);
  await page.goto(path);
  return { page, ip };
}

async function ask(page: Page, question: string) {
  await field(page).fill(question);
  await field(page).press("Enter");
}

const lastSent = async (page: Page, ip: string) => (await (await page.request.get(`${mockApi()}/_tiruan/asisten-terakhir?ip=${ip}`)).json()).body;

test("a visitor sees the intro, the privacy notice and suggestions, and a suggestion is sent at once", async ({ browser, isMobile }) => {
  const { page, ip } = await openVisitor(browser);
  await expect(main(page).getByRole("heading", { level: 1, name: "Agen AI" })).toBeVisible();
  await expect(main(page).getByRole("heading", { level: 2, name: "Tanya soal tempat di Kota Bogor" })).toBeVisible();
  await expect(main(page).getByText(/dikirim lewat server AksesBogor ke Anthropic \(Claude API\)/)).toBeVisible();
  await expect(main(page).getByRole("link", { name: "Kebijakan Privasi" })).toHaveAttribute("href", "/kebijakan-privasi");
  const suggestions = main(page).getByRole("group", { name: "Coba tanyakan" }).getByRole("button");
  // Ponsel menampilkan tiga saran supaya semuanya muat di atas kotak tulis.
  await expect(suggestions).toHaveCount(isMobile ? 3 : 4);
  await expect(main(page).getByRole("button", { name: "Kecamatan mana yang paling perlu didata?" })).toHaveCount(0);
  await expect(main(page).getByRole("button", { name: "Percakapan baru" })).toHaveCount(0);

  await main(page).getByRole("button", { name: "Masjid terdekat yang aksesibel" }).click();
  await expect(conversation(page).getByText("Masjid terdekat yang aksesibel")).toBeVisible();
  await expect(conversation(page)).toContainText(ANSWER);
  await expect(field(page)).toBeFocused();
  await expect(page.getByRole("status").filter({ hasText: "Agen AI menjawab:" })).toContainText(ANSWER);
  await expect(conversation(page).getByText("Sumber (1)")).toBeVisible();
  expect(await lastSent(page, ip)).toEqual({ question: "Masjid terdekat yang aksesibel", history: [] });
  await page.context().close();
});

test("Enter sends, Shift+Enter starts a new line, and the remaining characters show near the limit", async ({ browser }) => {
  const { page, ip } = await openVisitor(browser);
  await expect(main(page).getByRole("button", { name: "Kirim pertanyaan" })).toBeDisabled();
  await field(page).fill("Halte mana");
  await field(page).press("Shift+Enter");
  await field(page).pressSequentially("yang dekat?");
  await expect(field(page)).toHaveValue("Halte mana\nyang dekat?");
  await field(page).press("Enter");
  await expect(conversation(page)).toContainText(ANSWER);
  await expect(field(page)).toHaveValue("");
  expect((await lastSent(page, ip)).question).toBe("Halte mana\nyang dekat?");

  await field(page).fill("a".repeat(450));
  await expect(main(page).locator("#agen-sisa")).toHaveText("Sisa 50 karakter");
  await expect(field(page)).toHaveAttribute("aria-describedby", /agen-sisa/);
  await field(page).fill("x");
  await field(page).press("Enter");
  await expect(main(page).getByRole("alert")).toHaveText("Tulis pertanyaan paling sedikit 2 karakter.");
  await expect(field(page)).toHaveAttribute("aria-invalid", "true");
  await page.context().close();
});

test("keeps the conversation in the tab after a reload, sends it as history, and starts over", async ({ browser }) => {
  const { page, ip } = await openVisitor(browser);
  await ask(page, "Halte terdekat?");
  await expect(conversation(page)).toContainText(ANSWER);
  await page.reload();
  await expect(conversation(page)).toContainText("Halte terdekat?");
  await expect(conversation(page)).toContainText(ANSWER);
  await ask(page, "Bagaimana dengan rumah sakit?");
  await expect(conversation(page).getByText(ANSWER)).toHaveCount(2);
  expect((await lastSent(page, ip)).history).toEqual([
    { role: "user", content: "Halte terdekat?" },
    { role: "assistant", content: expect.stringContaining(ANSWER) },
  ]);

  await main(page).getByRole("button", { name: "Percakapan baru" }).click();
  await expect(main(page).getByRole("heading", { level: 2, name: "Tanya soal tempat di Kota Bogor" })).toBeVisible();
  await expect(field(page)).toBeFocused();
  await page.reload();
  await expect(main(page).getByRole("group", { name: "Coba tanyakan" })).toBeVisible();
  await expect(conversation(page)).toHaveCount(0);
  await page.context().close();
});

test("copies an answer", async ({ browser }) => {
  const { page } = await openVisitor(browser, PAGE, { permissions: ["clipboard-read", "clipboard-write"] });
  await ask(page, "Halte terdekat?");
  await conversation(page).getByRole("button", { name: "Salin jawaban" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Jawaban disalin." })).toBeAttached();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain(ANSWER);
  await page.context().close();
});

test("shows busy and quota errors in the conversation, with retry or sign-in", async ({ browser }) => {
  const { page } = await openVisitor(browser);
  await ask(page, "sibuk-tiruan, halte terdekat?");
  const busy = conversation(page).getByRole("alert");
  await expect(busy).toContainText("Asisten sedang sibuk. Coba lagi nanti.");
  await expect(busy.getByRole("button", { name: "Coba lagi" })).toBeVisible();

  await ask(page, "kuota-tiruan, rute ke halte?");
  const quota = conversation(page).getByRole("alert");
  await expect(quota).toContainText("Jatah 5 pertanyaan hari ini sudah habis.");
  await expect(quota.getByRole("button", { name: "Coba lagi" })).toHaveCount(0);
  await expect(quota.getByRole("link", { name: "Masuk" })).toHaveAttribute("href", "/masuk?kembali=%2Fagen");
  await page.context().close();
});

test("stops an answer and tries the same question again", async ({ browser }) => {
  const { page, ip } = await openVisitor(browser);
  let slow = true;
  await page.route("**/agen/tanya", async (route) => {
    if (slow) await new Promise((resolve) => setTimeout(resolve, 4000));
    await route.continue().catch(() => {});
  });
  await ask(page, "Rute ke halte?");
  await expect(conversation(page).getByText("Agen AI sedang menyusun jawaban…")).toBeVisible();
  const stop = main(page).getByRole("button", { name: "Hentikan jawaban" });
  await stop.click();
  await expect(conversation(page).getByText("Jawaban dihentikan.")).toBeVisible();
  await expect(field(page)).toBeFocused();

  slow = false;
  await conversation(page).getByRole("button", { name: "Coba lagi" }).click();
  await expect(conversation(page)).toContainText(ANSWER);
  await expect(conversation(page).getByText("Rute ke halte?")).toHaveCount(1);
  expect((await lastSent(page, ip)).question).toBe("Rute ke halte?");
  await page.context().close();
});

test("a long conversation offers a button back to the latest message", async ({ browser }) => {
  const context = await browser.newContext();
  const messages = Array.from({ length: 24 }, (_, i) =>
    i % 2 === 0
      ? { id: `p${i}`, role: "user", content: `Pertanyaan ${i}` }
      : { id: `p${i}`, role: "agent", content: `Jawaban ${i}.\nBaris kedua.\nBaris ketiga.`, sources: [], cards: [] },
  );
  await context.addInitScript((saved) => sessionStorage.setItem("aksesbogor.agen-ai", saved), JSON.stringify({ messages }));
  const page = await context.newPage();
  await stubMapbox(page);
  await page.goto(PAGE);
  await expect(conversation(page).getByText("Jawaban 23.")).toBeInViewport();
  const latest = main(page).getByRole("button", { name: "Ke pesan terbaru" });
  await expect(latest).toHaveCount(0);
  await conversation(page).getByText("Pertanyaan 0").scrollIntoViewIfNeeded();
  await latest.click();
  await expect(conversation(page).getByText("Jawaban 23.")).toBeInViewport();
  await expect(latest).toHaveCount(0);
  await expect(field(page)).toBeFocused();
  await context.close();
});

test("fits a 320 px screen with the composer above the Bottom nav, and hides the nav while typing", async ({ browser, isMobile }) => {
  test.skip(!isMobile, "Bottom nav hanya ada di layar sempit.");
  const { page } = await openVisitor(browser, PAGE, { viewport: { width: 320, height: 640 }, isMobile: true, hasTouch: true });
  await ask(page, "Halte terdekat?");
  await expect(conversation(page)).toContainText(ANSWER);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await field(page).blur();
  const nav = page.getByRole("navigation", { name: "Menu cepat" });
  await expect(nav).toBeVisible();
  const composer = (await field(page).boundingBox())!;
  expect(composer.y + composer.height).toBeLessThanOrEqual((await nav.boundingBox())!.y);
  await field(page).focus();
  await expect(nav).toBeHidden();
  await page.context().close();
});

test("says Agen AI is not open yet while the API keeps it off", async ({ browser }) => {
  const { page } = await openVisitor(browser, PAGE, { ip: ASSISTANT_OFF_IP });
  await expect(main(page).getByText("Agen AI belum dibuka")).toBeVisible();
  await expect(field(page)).toHaveCount(0);
  await page.context().close();
});

for (const colorScheme of ["light", "dark"] as const) {
  test(`Agen AI has no serious or critical WCAG 2.2 AA violations (${colorScheme})`, async ({ browser }) => {
    const { page } = await openVisitor(browser, `${PAGE}?tempat=${HALTE}`);
    await page.emulateMedia({ colorScheme, reducedMotion: "reduce" });
    await expect(field(page)).toBeVisible();
    expect(await blockingViolations(page)).toEqual([]);
    await ask(page, "Bagaimana cara ke Halte contoh?");
    await expect(conversation(page)).toContainText(ANSWER);
    await conversation(page).getByText("Sumber (1)").click();
    expect(await blockingViolations(page)).toEqual([]);
    await ask(page, "kuota-tiruan");
    await expect(conversation(page).getByRole("alert")).toBeVisible();
    expect(await blockingViolations(page)).toEqual([]);
    await page.context().close();
  });
}
