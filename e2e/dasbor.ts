import { test, type Page } from "@playwright/test";

/**
 * Menu dasbor (ADR-0046): sidebar di desktop, popover yang dibuka tombol Menu di ponsel. Mengembalikan wadah menu,
 * berisi navigasi, Keluar, dan Laporkan tempat. Popover yang sudah terbuka tidak ditekan lagi, karena itu menutupnya.
 */
export async function dashboardMenu(page: Page) {
  const menu = page.locator("#menu-dasbor");
  if (test.info().project.name === "ponsel" && !(await menu.evaluate((element) => element.matches(":popover-open")))) {
    await page.getByRole("button", { name: "Menu dasbor" }).click();
  }
  return menu;
}
