import { expect, test } from "@playwright/test";

// FR-51 (ADR-0041): halaman edukasi bisa dibuka dari footer, terbaca di layar 320 px, punya satu h1, menampilkan tanda
// draf, dan menutup dengan daftar sumber serta tautan ke Jelajahi dan Laporkan.
const PAGES = [
  { link: "Aksesibilitas", path: "/aksesibilitas", heading: "Mengenal aksesibilitas." },
  { link: "Disabilitas", path: "/disabilitas", heading: "Mengenal disabilitas." },
  { link: "Tips", path: "/tips", heading: "Tips berkunjung dan melapor." },
];

for (const { link, path, heading } of PAGES) {
  test(`the footer links to ${path}`, async ({ page }) => {
    await page.goto("/jelajahi");
    await page.getByRole("contentinfo").getByRole("link", { name: link, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`${path}$`));
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(heading);
  });

  test(`${path} has one h1, a draft notice, sources, and links to Jelajahi and Laporkan`, async ({ page }) => {
    await page.goto(path);
    const main = page.getByRole("main");
    await expect(main.getByRole("heading", { level: 1 })).toHaveCount(1);
    await expect(main.getByText(/^Draf\. Isi halaman ini masih menunggu tinjauan/)).toBeVisible();
    await expect(main.getByRole("region", { name: "Sumber" }).getByRole("listitem").first()).toBeVisible();
    await expect(main.getByRole("link", { name: "Jelajahi lokasi" })).toHaveAttribute("href", "/jelajahi");
    await expect(main.getByRole("link", { name: "Laporkan tempat" })).toHaveAttribute("href", "/laporkan");
  });

  test(`${path} fits a 320 px screen without scrolling sideways`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(heading);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
}

test("Aksesibilitas explains the four facilities, the four answers, and the status rules in order", async ({ page }) => {
  await page.goto("/aksesibilitas");
  const facilities = page.getByRole("region", { name: "Empat fasilitas yang kami catat" });
  await expect(facilities.getByRole("heading", { level: 3 })).toHaveText(["Guiding Block", "Ramp / Jalur Landai", "Toilet Difabel", "Lift / Elevator"]);
  const answers = page.getByRole("region", { name: "Empat jawaban untuk setiap fasilitas" });
  await expect(answers.getByRole("term")).toHaveText(["Tersedia", "Tidak tersedia", "Tidak perlu", "Belum diketahui"]);
  const rules = page.getByRole("region", { name: "Status dimulai dari pintu masuk" }).getByRole("listitem");
  await expect(rules).toHaveCount(4);
  await expect(rules.first()).toContainText("Tidak aksesibel");
  await expect(rules.last()).toContainText("Sebagian");
});

test("Disabilitas quotes the definition from UU No. 8 Tahun 2016 and lists the words we use", async ({ page }) => {
  await page.goto("/disabilitas");
  const meaning = page.getByRole("region", { name: "Siapa penyandang disabilitas" });
  await expect(meaning.getByRole("blockquote")).toContainText("dalam berinteraksi dengan lingkungan dapat mengalami hambatan");
  await expect(meaning.getByText("UU Nomor 8 Tahun 2016, Pasal 1 angka 1")).toBeVisible();
  const words = page.getByRole("region", { name: "Kata yang kami pakai" });
  await expect(words.getByRole("term")).toHaveText(["Penyandang disabilitas", "Sebutan menurut kebutuhan", "Difabel", "Kata yang kami hindari"]);
});

test("the education pages link to each other", async ({ page }) => {
  await page.goto("/aksesibilitas");
  await page.getByRole("region", { name: "Baca juga" }).getByRole("link", { name: "Mengenal disabilitas" }).click();
  await expect(page).toHaveURL(/\/disabilitas$/);
  await page.getByRole("region", { name: "Baca juga" }).getByRole("link", { name: "Mengenal aksesibilitas" }).click();
  await expect(page).toHaveURL(/\/aksesibilitas$/);
  await page.getByRole("link", { name: "Kebutuhan lain yang belum kami catat" }).click();
  await expect(page).toHaveURL(/\/disabilitas#kebutuhan$/);
});

test("the desktop header fits a 1280 px screen with the Disabilitas label", async ({ page, isMobile }) => {
  test.skip(isMobile, "the main menu is only shown from 1024 px");
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/disabilitas");
  await expect(page.getByRole("navigation", { name: "Menu utama" }).getByRole("link", { name: "Disabilitas" })).toHaveAttribute("aria-current", "page");
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});

test("Tips covers visiting, reporting, photos without faces or number plates, and what happens next", async ({ page }) => {
  await page.goto("/tips");
  const main = page.getByRole("main");
  await expect(main.getByRole("region", { name: "Sebelum berangkat" }).getByRole("listitem")).toHaveCount(6);
  const photos = main.getByRole("region", { name: "Foto yang membantu verifikasi" });
  await expect(photos.getByRole("term")).toHaveText(["Pintu masuk dan ramp", "Toilet difabel", "Guiding block", "Lift"]);
  await expect(photos.getByRole("heading", { name: "Jaga privasi orang lain" })).toBeVisible();
  await expect(photos).toContainText("wajah orang dan pelat nomor");
  await expect(main.getByRole("region", { name: "Setelah mengirim" })).toContainText("7 hari");
});

test("the main menu and the Lainnya menu reach every education page", async ({ page, isMobile }) => {
  await page.goto("/");
  for (const [name, path] of [
    ["Aksesibilitas", "/aksesibilitas"],
    ["Disabilitas", "/disabilitas"],
    ["Tips", "/tips"],
  ]) {
    if (isMobile) await page.getByRole("button", { name: "Lainnya" }).click();
    const menu = isMobile ? page.locator("#menu-lainnya") : page.getByRole("navigation", { name: "Menu utama" });
    await menu.getByRole("link", { name, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`${path}$`));
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  }
});
