import type { Page } from "@playwright/test";
import { signIn, uniqueEmail } from "./akun-masuk";
import { stubGoogle } from "./google";
import { expect, stubMapbox, test } from "./mapbox";

// Pintu masuk Agen AI (ADR-0054): menu, footer, Beranda, Detail lokasi, Laporkan, dan pengalihan dari Tanya rute dan
// Bantu memetakan.
const HALTE = "4037ba19-b366-45bc-aceb-270944fe9372";
const main = (page: Page) => page.getByRole("main");

test("Beranda, the menus, the footer and place pages lead to Agen AI", async ({ page, isMobile }) => {
  await stubMapbox(page);
  await page.goto("/");
  await expect(page.getByRole("contentinfo").getByRole("link", { name: "Agen AI", exact: true })).toHaveAttribute("href", "/agen");
  if (isMobile) {
    // Bottom nav dialirkan lalu menggantikan dirinya; tunggu tab aktif sebelum membuka Lainnya.
    await expect(page.getByRole("navigation", { name: "Menu cepat" }).locator("[aria-current=page]")).toBeVisible();
    await page.getByRole("button", { name: "Lainnya" }).click();
    await expect(page.locator("#menu-lainnya").getByRole("link", { name: "Agen AI", exact: true })).toHaveAttribute("href", "/agen");
    await page.keyboard.press("Escape");
  } else {
    await expect(page.getByRole("navigation", { name: "Menu utama" }).getByRole("link", { name: "Agen AI", exact: true })).toHaveAttribute("href", "/agen");
  }
  await main(page).getByRole("link", { name: "Tanya Agen AI cara ke sebuah tempat" }).click();
  await expect(page).toHaveURL(/\/agen$/);
  await expect(main(page).getByRole("heading", { level: 1, name: "Agen AI" })).toBeVisible();

  await page.goto(`/lokasi/${HALTE}`);
  const toPlace = main(page).getByRole("link", { name: "Tanya rute ke sini" });
  await expect(toPlace).toHaveAttribute("href", `/agen?tempat=${HALTE}`);
  await toPlace.click();
  await expect(main(page).getByText("Tujuan: Halte contoh")).toBeVisible();
});

test("the old Tanya rute and Bantu memetakan addresses redirect to Agen AI and keep the place", async ({ page, request }) => {
  const tanya = await request.get(`/tanya-rute?tempat=${HALTE}`, { maxRedirects: 0 });
  expect(tanya.status()).toBe(308);
  expect(tanya.headers().location).toBe(`/agen?tempat=${HALTE}`);
  const bantu = await request.get("/laporkan/bantu-memetakan", { maxRedirects: 0 });
  expect(bantu.status()).toBe(308);
  expect(bantu.headers().location).toBe("/agen");

  await stubMapbox(page);
  await page.goto(`/tanya-rute?tempat=${HALTE}`);
  await expect(page).toHaveURL(`/agen?tempat=${HALTE}`);
  await expect(main(page).getByText("Tujuan: Halte contoh")).toBeVisible();
});

test("the sitemap lists Agen AI instead of Tanya rute", async ({ request }) => {
  const sitemap = await (await request.get("/sitemap.xml")).text();
  expect(sitemap).toContain("/agen</loc>");
  expect(sitemap).not.toContain("/tanya-rute");
});

test("Laporkan offers Agen AI to signed-in contributors, and not to visitors", async ({ page }, testInfo) => {
  await stubGoogle(page);
  await page.goto("/laporkan");
  await expect(main(page).getByRole("heading", { level: 1 })).toBeVisible();
  await expect(main(page).getByRole("link", { name: "Tanya Agen AI" })).toHaveCount(0);

  await signIn(page, uniqueEmail("lama", testInfo.project.name), "/masuk?kembali=%2Flaporkan");
  await expect(page).toHaveURL("/laporkan");
  await expect(main(page).getByRole("complementary", { name: "Belum tahu tempat mana yang perlu didata?" }).getByRole("link", { name: "Tanya Agen AI" })).toHaveAttribute("href", "/agen");
});
