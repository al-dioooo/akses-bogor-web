import { expect, test, type Page } from "@playwright/test";
import { signIn, uniqueEmail } from "./akun-masuk";

test("page language is Indonesian", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("lang", "id");
});

test("skip link is the first stop and moves focus to the main content", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", { name: "Lewati ke konten utama" });
  await expect(skip).toBeFocused();
  await expect(skip).toBeVisible();
  const box = await skip.boundingBox();
  expect(box?.height).toBeGreaterThanOrEqual(44);
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#konten$/);
  await expect(page.getByRole("main")).toBeVisible();
});

test("main content keeps a readable width", async ({ page }) => {
  await page.goto("/");
  const box = await page.getByRole("main").boundingBox();
  const viewport = page.viewportSize();
  // Penjaga: token --spacing-* pernah mengubah max-w-2xl menjadi 3rem.
  expect(box?.width).toBeGreaterThanOrEqual(Math.min(640, (viewport?.width ?? 0) - 32));
});

/** Halaman tidak bisa digulir ke samping, dan isi header tidak keluar dari kolom halaman. */
async function expectHeaderFits(page: Page) {
  const scroll = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(scroll).toBe(0);
  const overhang = await page
    .getByRole("banner")
    .locator(".page-width")
    .evaluate((column) => {
      const edges = [...column.querySelectorAll("*")].map((el) => el.getBoundingClientRect().right);
      return Math.max(...edges) - column.getBoundingClientRect().right;
    });
  expect(overhang).toBeLessThanOrEqual(0.5);
}

test.describe("header on desktop widths", () => {
  test.skip(({ isMobile }) => isMobile, "phones always use the bottom nav");

  // Menu utama tampil mulai 1280 px; di bawahnya tujuh menu dan tombol kanan tidak muat, jadi Bottom nav dipakai.
  for (const width of [1024, 1152, 1280, 1440]) {
    test(`has no horizontal scroll at ${width} px, signed out and signed in`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await page.goto("/tentang");
      await expectHeaderFits(page);
      const [shown, hidden] = width >= 1280 ? ["Menu utama", "Menu cepat"] : ["Menu cepat", "Menu utama"];
      await expect(page.getByRole("navigation", { name: shown })).toBeVisible();
      await expect(page.getByRole("navigation", { name: hidden, includeHidden: true })).toBeHidden();

      await signIn(page, uniqueEmail("lama", test.info().project.name));
      await page.goto("/tentang");
      await expect(page.getByRole("banner").getByRole("link", { name: "Akun saya" })).toBeVisible();
      await expectHeaderFits(page);
    });
  }
});
