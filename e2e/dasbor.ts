import { test, type Page } from "@playwright/test";

/**
 * Menu dasbor (ADR-0046): sidebar di desktop, popover yang dibuka tombol Menu di ponsel. Mengembalikan wadah menu,
 * berisi navigasi, Keluar, dan Laporkan tempat.
 */
export async function dashboardMenu(page: Page) {
  if (test.info().project.name === "ponsel") await page.getByRole("button", { name: "Menu dasbor" }).click();
  return page.locator("#menu-dasbor");
}
