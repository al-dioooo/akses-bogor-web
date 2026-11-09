import { expect, test } from "@playwright/test";

// FR-51 (ADR-0041): halaman edukasi bisa dibuka dari footer, terbaca di layar 320 px, punya satu h1, menampilkan tanda
// draf, dan menutup dengan daftar sumber serta tautan ke Jelajahi dan Laporkan.
const PAGES = [{ link: "Aksesibilitas", path: "/aksesibilitas", heading: "Mengenal aksesibilitas." }];

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
