import type { Page } from "@playwright/test";
import { blockingViolations } from "./axe";
import { expect, openList, stubMapbox, test } from "./mapbox";

// Lapisan Prioritas pemetaan di Peta (ADR-0043, ADR-0053) dengan API tiruan (e2e/mock-api/prioritas.mjs) dan Mapbox
// tiruan. Lapisannya dipilih lewat pemilih Peta tematik.
/** IP pengunjung yang membuat API tiruan menjawab data_disabilitas_belum_aktif. */
const PRIORITY_OFF_IP = "203.0.113.251";
const main = (page: Page) => page.getByRole("main");
const chooser = (page: Page) => main(page).getByRole("button", { name: "Peta tematik" });
const option = (page: Page, name: string) => main(page).getByRole("button", { name, exact: true });
/** Membuka pemilih; ketukan sebelum halaman selesai di-hydrate tidak berbuat apa-apa, jadi diulang. */
async function openChooser(page: Page) {
  await expect(async () => {
    if ((await chooser(page).getAttribute("aria-expanded")) !== "true") await chooser(page).click();
    await expect(chooser(page)).toHaveAttribute("aria-expanded", "true", { timeout: 1000 });
  }).toPass();
}
/** Membuka pemilih Peta tematik dan memilih satu lapisan; pemilihnya tertutup lagi dan fokus kembali ke tombolnya. */
async function choose(page: Page, name: "Prioritas pemetaan" | "Tidak ada") {
  await openChooser(page);
  await option(page, name).click();
  await expect(chooser(page)).toBeFocused();
}
/** Kunci yang mengambang di atas peta (judulnya sama dengan tabel di panel daftar). */
const floatingKey = (page: Page) => main(page).locator("section.peta-kunci");
const isPhone = (page: Page) => (page.viewportSize()?.width ?? 0) < 768;
/** Di ponsel kunci mulai ringkas; tombol Catatan membuka legenda, catatan, sumber, dan tombol Tabel. */
async function expandKey(page: Page) {
  if (isPhone(page)) await floatingKey(page).getByRole("button", { name: /^Catatan, sumber/ }).click();
}
const OSM = /^© kontributor OpenStreetMap \(tab baru\)$/;

/** Bagian kunci digulir ke tampilan, lalu titik tengah baris pertamanya harus mengenai bagian itu sendiri. */
const reachable = (element: Element) => {
  element.scrollIntoView({ block: "nearest" });
  const box = element.getClientRects()[0];
  const hit = box && document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
  return !!hit && (hit === element || element.contains(hit));
};

/** Tombol dan tautan di kunci (dan kunci itu sendiri bila bisa difokus) yang terlihat tetapi terpotong atau tertutup. */
const clippedInKey = (page: Page) =>
  page.evaluate(() => {
    const key = document.querySelector<HTMLElement>(".peta-kunci");
    if (!key) return [];
    return [key, ...key.querySelectorAll<HTMLElement>("a[href], button")]
      .filter((element) => element.tabIndex >= 0 && element.checkVisibility({ visibilityProperty: true }) && !element.closest("[inert]"))
      .filter((element) => {
        element.scrollIntoView({ block: "nearest" });
        const box = element.getClientRects()[0];
        if (!box) return true;
        const keyBox = key.getBoundingClientRect();
        const inside = element === key || (box.top >= keyBox.top - 1 && box.bottom <= keyBox.bottom + 1);
        const hit = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
        return !inside || !hit || !(hit === element || element.contains(hit));
      })
      .map((element) => element.getAttribute("aria-label") ?? element.textContent);
  });

/** Komponen peta sudah mengukur ulang ruang kunci setelah lembar atau kunci berubah ukuran. */
const keyMeasured = (page: Page) =>
  expect
    .poll(() =>
      page.evaluate(() => {
        const main = document.querySelector<HTMLElement>("main")!;
        const key = document.querySelector(".peta-kunci")?.getBoundingClientRect();
        const sheet = document.querySelector(".peta-lembar")!.getBoundingClientRect();
        return !!key && main.style.getPropertyValue("--peta-kunci-maks") === `${Math.max(0, Math.floor(sheet.top - key.top - 8))}px`;
      }),
    )
    .toBe(true);

/** Marker yang bisa difokus tetapi tertutup elemen lain di titik tengahnya. */
const coveredMarkers = (page: Page) =>
  page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>(".mapboxgl-marker")]
      .filter((element) => element.tabIndex === 0)
      .filter((element) => {
        const box = element.getBoundingClientRect();
        const hit = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
        // Marker lain yang bertumpuk di peta yang diperkecil tidak dihitung; yang dicari adalah elemen yang mengambang.
        return !hit || !(hit === element || element.contains(hit) || hit.closest(".mapboxgl-marker"));
      })
      .map((element) => element.getAttribute("aria-label")),
  );

test("shows a floating key with the levels as text, the caveat and the source while the layer is on", async ({ page }) => {
  await page.goto("/peta");
  await expect(main(page).getByText("Memuat peta…")).toHaveCount(0);
  await openChooser(page);
  await expect(option(page, "Tidak ada")).toHaveAttribute("aria-pressed", "true");
  await option(page, "Prioritas pemetaan").click();
  await expect(chooser(page)).toHaveAttribute("aria-expanded", "false");
  await chooser(page).click();
  await expect(option(page, "Prioritas pemetaan")).toHaveAttribute("aria-pressed", "true");
  await page.keyboard.press("Escape");
  await expect(chooser(page)).toBeFocused();
  await expect(main(page).getByRole("status").filter({ hasText: "Lapisan Prioritas pemetaan tampil di peta" })).toBeAttached();
  await expect(page.locator(".mapboxgl-map")).toHaveAttribute("data-tematik", "prioritas");

  // Kunci mengambang di atas peta, tanpa membuka panel daftar; di ponsel mulai ringkas.
  const key = floatingKey(page);
  await expandKey(page);
  await expect(key.getByRole("list", { name: "Legenda prioritas" }).getByRole("listitem")).toHaveText(["Rendah", "Sedang", "Tinggi", "Sangat tinggi"]);
  await expect(key.getByText(/^Catatan: .*bukan jumlah seluruh penduduk; lonjakan antartahun besar/)).toBeVisible();
  await expect(key.getByText(/^Sumber: Open Data Kota Bogor, Dinas Sosial\. Batas kecamatan: © kontributor OpenStreetMap \(tab baru\)\./)).toBeVisible();
  // Kredit OSM menaut ke halaman hak cipta dan lisensinya (ODbL), di tab baru yang disebut di teks tautannya.
  const osm = key.getByRole("link", { name: OSM });
  await expect(osm).toHaveAttribute("href", "https://www.openstreetmap.org/copyright");
  await expect(osm).toHaveAttribute("target", "_blank");
  await expect(key.getByRole("link", { name: "Bantu memetakan" })).toHaveAttribute("href", "/laporkan/bantu-memetakan");
  expect(await main(page).textContent()).not.toMatch(/cacat/i);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

  await choose(page, "Tidak ada");
  await expect(main(page).getByRole("status").filter({ hasText: "Peta tematik disembunyikan." })).toBeAttached();
  await expect(page.locator(".mapboxgl-map")).not.toHaveAttribute("data-tematik");
  await expect(key).toHaveCount(0);
  await expect(main(page).getByRole("table")).toHaveCount(0);
});

for (const viewport of [
  { width: 320, height: 568 },
  { width: 360, height: 740 },
]) {
  for (const sheet of ["kecil", "setengah"] as const) {
    test(`on a ${viewport.width}×${viewport.height} phone with the sheet ${sheet} the key is one line and nothing in it is clipped`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== "ponsel", "Ukuran ponsel ditentukan tes ini sendiri");
      await page.setViewportSize(viewport);
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto("/peta");
      await expect(main(page).getByRole("group", { name: "Kontrol peta" })).toBeVisible({ timeout: 15_000 });
      await choose(page, "Prioritas pemetaan");
      if (sheet === "setengah") await openList(page);
      await keyMeasured(page);
      const key = floatingKey(page);
      // Termasuk saat kunci disembunyikan karena tidak ada ruang.
      const more = key.getByRole("button", { name: /^Catatan, sumber/, includeHidden: true });
      // Ringkas: satu baris, jadi lapisan berwarna tetap terlihat di antara pencarian dan lembar.
      await expect(more).toHaveAttribute("aria-expanded", "false");
      expect((await key.boundingBox())!.height).toBeLessThanOrEqual(60);
      await expect.poll(() => clippedInKey(page)).toEqual([]);
      if (await key.evaluate((element) => element.checkVisibility({ visibilityProperty: true }))) {
        await expect(more).toHaveText("Catatan");
        await more.click();
        await expect(key.getByRole("button", { name: "Ringkas kunci prioritas" })).toHaveAttribute("aria-expanded", "true");
        await keyMeasured(page);
        for (const part of [key.getByText(/bukan jumlah seluruh penduduk/), key.getByText(/^Sumber: Open Data/), key.getByRole("link", { name: OSM })]) {
          await expect.poll(() => part.evaluate(reachable)).toBe(true);
        }
        await expect.poll(() => clippedInKey(page)).toEqual([]);
      } else {
        // Satu baris pun tidak muat di atas lembar: kunci disembunyikan, dan catatan serta sumbernya ada di tabel panel.
        await expect(page.locator("#tabel-prioritas").getByText(/bukan jumlah seluruh penduduk/)).toBeAttached();
      }
      await expect.poll(() => coveredMarkers(page)).toEqual([]);
    });
  }
}

for (const viewport of [
  { width: 667, height: 375 },
  { width: 1024, height: 600 },
]) {
  test(`the open key stays above the list panel and markers under it cannot take focus (${viewport.width}×${viewport.height})`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/peta");
    await expect(main(page).getByRole("group", { name: "Kontrol peta" })).toBeVisible({ timeout: 15_000 });
    await choose(page, "Prioritas pemetaan");
    await expandKey(page);
    const key = floatingKey(page);
    for (const part of [key.getByText(/bukan jumlah seluruh penduduk/), key.getByRole("link", { name: OSM }), key.getByRole("link", { name: "Bantu memetakan" })]) {
      await expect.poll(() => part.evaluate(reachable)).toBe(true);
    }
    await expect.poll(() => clippedInKey(page)).toEqual([]);
    await expect.poll(() => coveredMarkers(page)).toEqual([]);
  });
}

test("the table button opens the list panel at the ranked table with its source", async ({ page }) => {
  await page.goto("/peta");
  await choose(page, "Prioritas pemetaan");
  await expandKey(page);
  await main(page).getByRole("button", { name: "Tabel prioritas kecamatan" }).click();
  await expect(page.locator("#tabel-prioritas")).toBeFocused();
  await expect(main(page).getByRole("heading", { level: 3, name: "Prioritas kecamatan 2025" })).toBeVisible();
  const rows = main(page).getByRole("table").getByRole("row");
  await expect(rows.nth(1)).toContainText("Bogor Barat");
  await expect(rows.nth(1)).toContainText("Sangat tinggi");
  const table = page.locator("#tabel-prioritas");
  await expect(table.getByText(/bukan jumlah seluruh penduduk; lonjakan antartahun besar/)).toBeVisible();
  await expect(table.getByText(/Open Data Kota Bogor, Dinas Sosial/)).toBeVisible();
  await expect(table.getByText("Batas kecamatan: © kontributor OpenStreetMap (tab baru).")).toBeVisible();
});

test("hides the thematic map chooser while the API keeps the disability data off", async ({ browser }) => {
  const context = await browser.newContext({ extraHTTPHeaders: { "x-forwarded-for": PRIORITY_OFF_IP } });
  const page = await context.newPage();
  await stubMapbox(page);
  await page.goto("/peta");
  await expect(main(page).getByRole("heading", { level: 1 })).toBeVisible();
  await expect(main(page).getByRole("status").first()).toBeVisible();
  await expect(chooser(page)).toHaveCount(0);
  await context.close();
});

test("keeps the table when the boundaries cannot load", async ({ page }) => {
  await page.route("**/peta/batas-kecamatan", (route) => route.fulfill({ status: 503, json: { galat: "galat_api" } }));
  await page.goto("/peta");
  await choose(page, "Prioritas pemetaan");
  await expect(main(page).getByRole("alert")).toContainText("Batas kecamatan tidak bisa dimuat");
  await main(page).getByRole("button", { name: "Tabel prioritas kecamatan" }).click();
  await expect(main(page).getByRole("table")).toBeVisible();
});

for (const colorScheme of ["light", "dark"] as const) {
  test(`the priority layer has no serious or critical WCAG 2.2 AA violations (${colorScheme})`, async ({ page }) => {
    await page.emulateMedia({ colorScheme, reducedMotion: "reduce" });
    await page.goto("/peta");
    await choose(page, "Prioritas pemetaan");
    await openList(page);
    await expect(main(page).getByRole("table")).toBeVisible();
    expect(await blockingViolations(page)).toEqual([]);
  });
}
