import { expect, test, type Page } from "@playwright/test";
import { signIn, uniqueEmail } from "./akun-masuk";
import { blockingViolations } from "./axe";
import { dashboardMenu } from "./dasbor";
import { stubGoogle } from "./google";

// Kerangka dasbor akun (ADR-0046) dengan API tiruan: menu per peran, menu ringkas di ponsel, dan tata letak.
const email = (prefix: string) => uniqueEmail(prefix, test.info().project.name);
const isPhone = () => test.info().project.name === "ponsel";

test.beforeEach(async ({ page }) => {
  await stubGoogle(page);
});

async function menuLinks(page: Page) {
  return (await dashboardMenu(page)).getByRole("navigation", { name: "Menu dasbor" }).getByRole("link");
}

test("shows a regular account only its own menu, with the open page marked", async ({ page }) => {
  await signIn(page, email("lama"));
  await expect(page).toHaveURL(/\/akun$/);
  const links = await menuLinks(page);
  await expect(links).toHaveText(["Akun saya", "Bantu memetakan"]);
  await expect(links.first()).toHaveAttribute("aria-current", "page");
  await expect(page.getByText("Verifikasi", { exact: true })).toHaveCount(0);
});

test("adds the verification desk for verifiers and the team page for admins", async ({ page }) => {
  await signIn(page, email("verifikator"));
  await expect(await menuLinks(page)).toHaveText(["Akun saya", "Bantu memetakan", "Antrean", "Menunggu jawaban", "Perlu dicek ulang"]);

  await page.context().clearCookies();
  await signIn(page, email("admin"));
  const links = await menuLinks(page);
  await expect(links.last()).toHaveText("Tim verifikator");
  await expect(links.last()).toHaveAttribute("href", "/verifikasi/tim");
});

test("names the account and its role next to the menu", async ({ page }) => {
  await signIn(page, email("verifikator"));
  // Di ponsel di atas isi halaman, di desktop di puncak sidebar; keduanya sebelum `main`.
  const shell = page.getByRole("main").locator("..");
  await expect(shell.getByText("Sari", { exact: true }).filter({ visible: true }).first()).toBeVisible();
  await expect(shell.getByText("Verifikator", { exact: true }).filter({ visible: true }).first()).toBeVisible();
});

test("skip link jumps past the dashboard menu to the page content", async ({ page }) => {
  test.skip(isPhone(), "the skip link is checked with a keyboard on desktop");
  await signIn(page, email("lama"));
  await page.goto("/akun");
  await expect(page.getByRole("navigation", { name: "Menu dasbor" })).toBeVisible();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Lewati ke konten utama" })).toBeFocused();
  await page.keyboard.press("Enter");
  await page.keyboard.press("Tab");
  expect(await page.evaluate(() => Boolean(document.activeElement?.closest("main")))).toBe(true);
});

test.describe("menu on phones", () => {
  test.skip(() => !isPhone(), "desktop shows the sidebar");

  test("opens from the Menu button, closes with Escape, and returns focus", async ({ page }) => {
    await signIn(page, email("admin"));
    const button = page.getByRole("button", { name: "Menu dasbor" });
    const nav = page.getByRole("navigation", { name: "Menu dasbor" });
    await expect(nav).toBeHidden();
    await button.click();
    await expect(nav).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(nav).toBeHidden();
    await expect(button).toBeFocused();
  });

  test("closes after choosing a page", async ({ page }) => {
    await signIn(page, email("verifikator"));
    await (await dashboardMenu(page)).getByRole("link", { name: "Menunggu jawaban" }).click();
    await expect(page).toHaveURL(/\/verifikasi\/jawaban$/);
    await expect(page.getByRole("navigation", { name: "Menu dasbor" })).toBeHidden();
  });
});

// Halaman paling lebar di dasbor: meja, pemeriksaan laporan dengan foto dan pembanding, dan percakapan agen.
const WIDE_PAGES = ["/akun", "/verifikasi", "/verifikasi/laporan/10000000-0000-4000-8000-000000000002", "/laporkan/bantu-memetakan"];

test("has no horizontal scroll from 320 px up", async ({ page }) => {
  await signIn(page, email("admin"));
  const widths = isPhone() ? [320, 360, 412] : [1024, 1152, 1280, 1440];
  for (const width of widths) {
    await page.setViewportSize({ width, height: 800 });
    for (const path of WIDE_PAGES) {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, `${path} at ${width} px`).toBe(0);
    }
  }
});

for (const colorScheme of ["light", "dark"] as const) {
  test(`dashboard menu (${colorScheme}) has no serious or critical WCAG 2.2 AA violations`, async ({ page }) => {
    await page.emulateMedia({ colorScheme, reducedMotion: "reduce" });
    await signIn(page, email("admin"));
    // Next 16 mengalirkan <title> setelah redirect dari server action; axe memeriksa judul dokumen.
    await expect(page).toHaveTitle(/^Akun saya/);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(await menuLinks(page)).toHaveCount(6);
    expect(await blockingViolations(page)).toEqual([]);
  });
}
