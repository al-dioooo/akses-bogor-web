import type { Page } from "@playwright/test";
import { blockingViolations } from "./axe";
import { expect, test } from "./mapbox";

// "Lokasi saya" di Peta dengan lokasi tiruan dari Playwright. Posisi hanya dipakai di browser untuk menggeser peta.
const button = (page: Page) => page.getByRole("button", { name: "Tampilkan lokasi saya" });

async function openMap(page: Page) {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/peta");
  test.skip(!(await page.evaluate(() => !!document.createElement("canvas").getContext("webgl"))), "WebGL tidak tersedia di browser ini");
  await expect(page.getByRole("group", { name: "Kontrol peta" })).toBeVisible({ timeout: 15_000 });
}

test("explains the location permission first and closes with Cancel or Escape", async ({ page }) => {
  await openMap(page);
  await button(page).click();
  const dialog = page.getByRole("dialog", { name: "Tampilkan lokasi Anda di peta?" });
  await expect(dialog.getByRole("heading")).toBeFocused();
  await expect(dialog).toContainText("tidak dikirim ke AksesBogor");
  expect(await blockingViolations(page)).toEqual([]);
  await dialog.getByRole("button", { name: "Batal" }).click();
  await expect(dialog).toHaveCount(0);
  await expect(button(page)).toBeFocused();
  await button(page).press("Enter");
  await expect(dialog.getByRole("heading")).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(button(page)).toBeFocused();
});

for (const viewport of [
  { width: 320, height: 568 },
  { width: 667, height: 375 },
]) {
  test(`the permission card stays above the list panel on a small screen (${viewport.width}×${viewport.height})`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await openMap(page);
    await button(page).click();
    const dialog = page.getByRole("dialog", { name: "Tampilkan lokasi Anda di peta?" });
    await expect(dialog.getByRole("heading")).toBeFocused();
    for (const name of ["Izinkan lokasi", "Batal"]) {
      await expect
        .poll(() =>
          dialog.getByRole("button", { name }).evaluate((element) => {
            element.scrollIntoView({ block: "nearest" });
            const box = element.getBoundingClientRect();
            const hit = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
            return !!hit && (hit === element || element.contains(hit));
          }),
        )
        .toBe(true);
    }
    // Fokus yang pindah ke luar kartu menutupnya, supaya kartu tidak pernah menutupi elemen yang sedang difokus.
    await dialog.getByRole("button", { name: "Batal" }).focus();
    await page.keyboard.press("Tab");
    await expect(dialog).toHaveCount(0);
  });
}

test("says so when the browser refuses the location", async ({ page }) => {
  // Penolakan dibuat pasti: tanpa ini, lama browser tanpa layar menolak izin bergantung pada beban mesin.
  await page.addInitScript(() => {
    navigator.geolocation.getCurrentPosition = (_success, failure) =>
      failure?.({ code: 1, message: "ditolak", PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 } as GeolocationPositionError);
  });
  await openMap(page);
  await button(page).click();
  await page.getByRole("button", { name: "Izinkan lokasi" }).click();
  // Fokus kembali ke tombol Lokasi saya selama lokasi dicari.
  await expect(button(page)).toBeFocused();
  await expect(page.getByText("Izin lokasi ditolak. Anda bisa mengizinkannya lagi di pengaturan browser.").first()).toBeVisible();
  await page.getByRole("button", { name: "Tutup pesan lokasi" }).click();
  await expect(button(page)).toBeFocused();
});

test("moves the map to the user's position when permission is already given", async ({ page, context }) => {
  await context.grantPermissions(["geolocation"]);
  await context.setGeolocation({ latitude: -6.5971, longitude: 106.7972 });
  await openMap(page);
  await button(page).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("status").filter({ hasText: "Peta digeser ke lokasi Anda." })).toBeAttached();
  await expect(page.locator(".peta-saya")).toHaveCount(1);
  await expect(page.locator(".peta-saya")).toHaveAttribute("aria-hidden", "true");
});

test("does not move the map to a position outside Kota Bogor", async ({ page, context }) => {
  await context.grantPermissions(["geolocation"]);
  await context.setGeolocation({ latitude: -6.2, longitude: 106.82 });
  await openMap(page);
  await button(page).click();
  await expect(page.getByText("Lokasi Anda di luar Kota Bogor, jadi peta tidak digeser.").first()).toBeVisible();
  await expect(page.locator(".peta-saya")).toHaveCount(0);
});
