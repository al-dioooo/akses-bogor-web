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

for (const viewport of [
  { width: 320, height: 568 },
  { width: 667, height: 375 },
]) {
  test(`the searching and refused messages never cover the focused Lokasi saya button (${viewport.width}×${viewport.height})`, async ({ page }) => {
    // Lokasi pertama tidak pernah datang (masih mencari); yang kedua ditolak.
    await page.addInitScript(() => {
      let calls = 0;
      navigator.geolocation.getCurrentPosition = (_success, failure) => {
        calls += 1;
        if (calls > 1) failure?.({ code: 1, message: "ditolak", PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 } as GeolocationPositionError);
      };
    });
    await page.setViewportSize(viewport);
    await openMap(page);
    const uncovered = () =>
      button(page).evaluate((element) => {
        const box = element.getBoundingClientRect();
        const hit = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
        return !!hit && (hit === element || element.contains(hit));
      });
    await button(page).click();
    await page.getByRole("button", { name: "Izinkan lokasi" }).click();
    await expect(page.getByText("Mencari lokasi Anda…").first()).toBeVisible();
    await expect(button(page)).toBeFocused();
    expect(await uncovered()).toBe(true);
    await button(page).press("Enter");
    await expect(page.getByText("Izin lokasi ditolak. Anda bisa mengizinkannya lagi di pengaturan browser.").first()).toBeVisible();
    await expect(button(page)).toBeFocused();
    expect(await uncovered()).toBe(true);
  });
}

for (const viewport of [
  { width: 667, height: 375 },
  { width: 568, height: 320 },
]) {
  test(`on a landscape phone a refused message keeps its close button and goes away when focus leaves the controls (${viewport.width}×${viewport.height})`, async ({ page }) => {
    await page.addInitScript(() => {
      navigator.geolocation.getCurrentPosition = (_success, failure) =>
        failure?.({ code: 1, message: "ditolak", PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 } as GeolocationPositionError);
    });
    await page.setViewportSize(viewport);
    await openMap(page);
    await button(page).click();
    await page.getByRole("button", { name: "Izinkan lokasi" }).click();
    const close = page.getByRole("button", { name: "Tutup pesan lokasi" });
    await expect(close).toBeVisible();
    // Tombol tutup tidak terpotong oleh kartunya sendiri dan tidak tertutup elemen lain.
    expect(
      await close.evaluate((element) => {
        const box = element.getBoundingClientRect();
        const card = element.closest(".peta-lokasi")!.getBoundingClientRect();
        const hit = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
        return box.top >= card.top && box.bottom <= card.bottom + 0.5 && !!hit && (hit === element || element.contains(hit));
      }),
    ).toBe(true);
    // Pesan tidak tertinggal: fokus ke tombol tutupnya membiarkannya, fokus yang pindah ke luar kontrol peta menutupnya.
    await expect(button(page)).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(close).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(close).toHaveCount(0);
    await page.getByRole("button", { name: "Tampilkan daftar" }).click();
    await expect(page.getByRole("button", { name: "Tampilkan peta" })).toBeVisible();
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
