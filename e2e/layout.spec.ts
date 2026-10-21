import { expect, test } from "@playwright/test";

test("page language is Indonesian", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("lang", "id");
});

test("skip link is the first stop and moves focus to the main content", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", { name: "Lewati ke konten utama" });
  await expect(skip).toBeFocused();
  await expect(skip).toBeVisible();
  const box = await skip.boundingBox();
  expect(box?.height).toBeGreaterThanOrEqual(44);
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#konten$/);
  await expect(page.getByRole("main")).toBeVisible();
});

test("main content keeps a readable width", async ({ page }) => {
  await page.goto("/");
  const box = await page.getByRole("main").boundingBox();
  const viewport = page.viewportSize();
  // Penjaga: token --spacing-* pernah mengubah max-w-2xl menjadi 3rem.
  expect(box?.width).toBeGreaterThanOrEqual(Math.min(640, (viewport?.width ?? 0) - 32));
});
