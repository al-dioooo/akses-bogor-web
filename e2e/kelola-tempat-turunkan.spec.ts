import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { mockApi, signIn, uniqueEmail } from "./akun-masuk";
import { blockingViolations } from "./axe";
import { stubGoogle } from "./google";

// Turunkan, tayangkan lagi, dan kandidat OpenStreetMap di Kelola tempat (ADR-0050) dengan API tiruan.
const email = (prefix: string) => uniqueEmail(prefix, test.info().project.name);
const main = (page: Page) => page.getByRole("main");
const unknown = ["ramp", "toilet_difabel", "guiding_block", "lift"].map((facility) => ({ facility, answer: "belum_tahu" }));

async function createViaApi(request: APIRequestContext, admin: string, name: string) {
  const response = await request.post(`${mockApi()}/admin/places`, {
    headers: { authorization: `Bearer akun:${admin}` },
    data: { name, category: "halte", location: { lat: -6.6, lng: 106.8 }, facilities: unknown, photos: [], reason: "Dibuat untuk tes" },
  });
  return ((await response.json()) as { placeId: string }).placeId;
}

test.beforeEach(async ({ page }) => {
  await stubGoogle(page);
});

test("takes a place down with a reason, hides it from the public, and shows it again", async ({ page, request }) => {
  const admin = email("admin");
  const name = `Halte turun ${test.info().project.name}`;
  await signIn(page, admin);
  const id = await createViaApi(request, admin, name);
  await page.goto(`/verifikasi/tempat/${id}`);

  const open = main(page).getByRole("button", { name: "Turunkan dari tayang" });
  await open.click();
  const dialog = page.getByRole("dialog", { name: `Turunkan ${name}?` });
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(open).toBeFocused();

  await open.click();
  await dialog.getByRole("button", { name: "Turunkan" }).click();
  await expect(dialog.getByLabel("Alasan")).toBeFocused();
  await expect(dialog.getByText("Tulis alasan, paling sedikit 5 karakter.")).toBeVisible();
  await dialog.getByLabel("Alasan").fill("Halte dibongkar untuk pelebaran jalan");
  await dialog.getByRole("button", { name: "Turunkan" }).click();

  await expect(page).toHaveURL(`/verifikasi/tempat/${id}?tindakan=diturunkan`);
  await expect(main(page).getByRole("status").filter({ hasText: "sudah diturunkan" })).toBeVisible();
  await expect(main(page)).toContainText("Alasan: Halte dibongkar untuk pelebaran jalan");
  await expect(main(page).getByRole("link", { name: "Ubah tempat" })).toHaveCount(0);
  await expect(main(page).getByRole("region", { name: "Riwayat" }).getByRole("listitem").first()).toContainText("Diturunkan");
  expect((await request.get(`${mockApi()}/places/${id}`)).status()).toBe(404);

  await main(page).getByRole("button", { name: "Tayangkan lagi" }).click();
  const restore = page.getByRole("dialog", { name: `Tayangkan lagi ${name}?` });
  await restore.getByLabel("Alasan").fill("Pelebaran jalan dibatalkan");
  await restore.getByRole("button", { name: "Tayangkan lagi" }).click();
  await expect(page).toHaveURL(`/verifikasi/tempat/${id}?tindakan=ditayangkan`);
  await expect(main(page).getByRole("status").filter({ hasText: "tayang lagi" })).toBeVisible();
  expect((await request.get(`${mockApi()}/places/${id}`)).status()).toBe(200);
});

test("lists OpenStreetMap candidates and starts a place from one", async ({ page }) => {
  await signIn(page, email("admin"));
  await page.goto("/verifikasi/tempat");
  await main(page).getByRole("link", { name: "Kandidat OpenStreetMap" }).click();
  await expect(page).toHaveURL("/verifikasi/tempat/kandidat");
  const rows = main(page).getByRole("region", { name: /kandidat/ }).getByRole("listitem");
  const masjid = rows.filter({ hasText: "Masjid Al-Ikhlas" });
  await expect(masjid).toContainText("Menurut OpenStreetMap: sebagian bisa dimasuki kursi roda");
  await expect(rows.filter({ hasText: "Rumah Sakit tanpa nama" })).toHaveCount(1);
  await expect(masjid.getByRole("link", { name: "Lihat di OpenStreetMap: Masjid Al-Ikhlas (tab baru)" })).toHaveAttribute("href", "https://www.openstreetmap.org/way/2");
  await expect(main(page)).toContainText("© kontributor OpenStreetMap");
  await masjid.getByRole("link", { name: "Buat tempat dari Masjid Al-Ikhlas" }).click();
  await expect(page).toHaveURL(/\/verifikasi\/tempat\/baru\?osm=way%2F2/);
  await expect(main(page).getByRole("textbox", { name: "Nama tempat" })).toHaveValue("Masjid Al-Ikhlas");
});

for (const colorScheme of ["light", "dark"] as const) {
  test(`the take-down dialog and the candidate list (${colorScheme}) have no serious or critical WCAG 2.2 AA violations`, async ({ page, request }) => {
    const admin = email("admin");
    await page.emulateMedia({ colorScheme, reducedMotion: "reduce" });
    await signIn(page, admin);
    const id = await createViaApi(request, admin, `Halte axe ${test.info().project.name} ${colorScheme}`);
    await page.goto(`/verifikasi/tempat/${id}`);
    await main(page).getByRole("button", { name: "Turunkan dari tayang" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Turunkan" }).click();
    await expect(page.getByRole("dialog").getByText("Tulis alasan, paling sedikit 5 karakter.")).toBeVisible();
    expect(await blockingViolations(page)).toEqual([]);
    await page.goto("/verifikasi/tempat/kandidat");
    await expect(main(page).getByRole("heading", { level: 3 }).first()).toBeVisible();
    expect(await blockingViolations(page)).toEqual([]);
  });
}
