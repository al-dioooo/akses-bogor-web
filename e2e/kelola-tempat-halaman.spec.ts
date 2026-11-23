import { expect, test, type APIRequestContext } from "@playwright/test";
import { mockApi, signIn, uniqueEmail } from "./akun-masuk";
import { blockingViolations } from "./axe";
import { stubGoogle } from "./google";

// Satu tempat di Kelola tempat (ADR-0050): data, jawaban, foto, keadaan tayang, dan riwayat. Tempat dibuat langsung lewat
// API tiruan, supaya data contoh yang dipakai tes lain tidak berubah.
const email = (prefix: string) => uniqueEmail(prefix, test.info().project.name);
const MASJID_A = "e553b67f-7583-4831-9dbb-29639159517f";
const facilities = (ramp = "belum_tahu") => ["ramp", "toilet_difabel", "guiding_block", "lift"].map((facility) => ({ facility, answer: facility === "ramp" ? ramp : "belum_tahu" }));

/** Tempat baru buatan admin di API tiruan, lalu diturunkan dan ditayangkan lagi supaya riwayatnya berisi. */
async function placeWithHistory(request: APIRequestContext, admin: string) {
  const headers = { authorization: `Bearer akun:${admin}` };
  const name = `Halte riwayat ${test.info().project.name}`;
  const created = await request.post(`${mockApi()}/admin/places`, {
    headers,
    data: { name, category: "halte", location: { lat: -6.6, lng: 106.8 }, facilities: facilities("tidak_tersedia").map((f) => (f.facility === "ramp" ? { ...f, reason: "tidak_ada" } : f)), photos: [], reason: "Survei tim pagi ini" },
  });
  const { placeId } = (await created.json()) as { placeId: string };
  await request.delete(`${mockApi()}/admin/places/${placeId}`, { headers, data: { reason: "Halte dipindah sementara" } });
  await request.post(`${mockApi()}/admin/places/${placeId}/restore`, { headers, data: { reason: "Halte kembali dipakai" } });
  return { placeId, name };
}

test.beforeEach(async ({ page }) => {
  await stubGoogle(page);
});

test("shows the data, the answers and who published an admin place, with a link to its public page", async ({ page }) => {
  await signIn(page, email("admin"));
  await page.goto("/verifikasi/tempat");
  await page.getByRole("link", { name: "Masjid contoh A" }).click();
  await expect(page).toHaveURL(`/verifikasi/tempat/${MASJID_A}`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Masjid contoh A");
  const data = page.getByRole("region", { name: "Data tempat" });
  await expect(data).toContainText(/Langsung oleh admin Admin Kota, \d+ \w+ \d{4}/);
  await expect(page.getByRole("region", { name: "Jawaban fasilitas" }).getByRole("listitem")).toHaveCount(4);
  await expect(page.getByRole("link", { name: "Lihat halaman publik" })).toHaveAttribute("href", `/lokasi/${MASJID_A}`);
  await page.getByRole("link", { name: "Kembali ke Kelola tempat" }).click();
  await expect(page).toHaveURL("/verifikasi/tempat");
});

test("lists the history with the action, the team member, the reason and the earlier reason", async ({ page, request }) => {
  const admin = email("admin");
  await signIn(page, admin);
  const { placeId } = await placeWithHistory(request, admin);
  await page.goto(`/verifikasi/tempat/${placeId}`);
  const entries = page.getByRole("region", { name: "Riwayat" }).getByRole("listitem");
  await expect(entries).toHaveCount(3);
  await expect(entries.nth(0)).toContainText("Ditayangkan lagi");
  await expect(entries.nth(0)).toContainText("Sari");
  await expect(entries.nth(0)).toContainText("Alasan: Halte kembali dipakai");
  await expect(entries.nth(0)).toContainText("Alasan diturunkan sebelumnya: Halte dipindah sementara");
  await expect(entries.nth(2)).toContainText("Dibuat langsung oleh admin");
  await expect(entries.nth(2)).toContainText("Alasan: Survei tim pagi ini");
  await expect(page.getByRole("region", { name: "Data tempat" })).toContainText("0 dari 4 tersedia, 3 belum diketahui");
});

test("shows the not-found page for an unknown place", async ({ page }) => {
  await signIn(page, email("admin"));
  await page.goto("/verifikasi/tempat/00000000-0000-4000-8000-000000000000");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Halaman ini belum ada.");
});

for (const colorScheme of ["light", "dark"] as const) {
  test(`an admin place page (${colorScheme}) has no serious or critical WCAG 2.2 AA violations`, async ({ page, request }) => {
    const admin = email("admin");
    await page.emulateMedia({ colorScheme, reducedMotion: "reduce" });
    await signIn(page, admin);
    const { placeId } = await placeWithHistory(request, admin);
    await page.goto(`/verifikasi/tempat/${placeId}`);
    await expect(page.getByRole("region", { name: "Riwayat" }).getByRole("listitem")).toHaveCount(3);
    expect(await blockingViolations(page)).toEqual([]);
  });
}
