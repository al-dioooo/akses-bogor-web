import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";

const WCAG_22_AA = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

// Marker peta yang berdempetan di zoom kota tidak dihitung untuk target-size. WCAG 2.5.8 mengecualikan target yang
// posisinya esensial (peta) dan target yang punya kontrol setara: tombol "Tunjukkan di peta" di daftar lokasi.
const exempt = (rule: string, target: string) => rule === "target-size" && target.includes(".mapboxgl-marker");

/** Pelanggaran WCAG 2.2 AA berdampak serious atau critical di halaman yang sedang dibuka. */
export async function blockingViolations(page: Page) {
  const { violations } = await new AxeBuilder({ page }).withTags(WCAG_22_AA).analyze();
  return violations
    .filter((v) => v.impact === "serious" || v.impact === "critical")
    .map((v) => ({
      rule: v.id,
      impact: v.impact,
      targets: v.nodes.map((n) => n.target.join(" ")).filter((target) => !exempt(v.id, target)),
    }))
    .filter((v) => v.targets.length > 0);
}
