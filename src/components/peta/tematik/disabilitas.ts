import { LEVEL_COLOR, LEVELS } from "@/components/prioritas/levels";
import type { DisabilityCategory, DisabilityCounts } from "@/lib/api";

/** Skala ungu yang sama untuk semua lapisan tematik (ADR-0053), dari kelas terendah. */
export const RAMP = LEVELS.map((level) => LEVEL_COLOR[level]);

export type DisabilityFilter = { category: DisabilityCategory | "semua"; year: number };

/** Jumlah terdaftar per kecamatan untuk satu jenis (atau semua jenis) dan satu tahun; kecamatan tanpa angka bernilai 0. */
export function countsFor(data: DisabilityCounts, filter: DisabilityFilter): { slug: string; name: string; count: number }[] {
  return data.districts.map(({ slug, name, counts }) => ({
    slug,
    name,
    count: counts.filter((c) => c.year === filter.year && (filter.category === "semua" || c.category === filter.category)).reduce((sum, c) => sum + c.count, 0),
  }));
}

const NICE = [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 7.5, 8];

/**
 * Lebar satu kelas: empat kelas yang sama lebar dari 0, dengan angka terbesar di kelas tergelap. Lebarnya angka bulat
 * yang mudah dibaca bila ada (mis. terbesar 1.240 menjadi kelas selebar 400), atau sepertiga angka terbesar bila tidak.
 */
export function classWidth(max: number): number {
  const classes = RAMP.length;
  if (max < classes - 1) return 1;
  const power = 10 ** Math.floor(Math.log10(max / classes));
  const fits = [power / 10, power, power * 10]
    .flatMap((p) => NICE.map((step) => Math.round(step * p)))
    .filter((width) => width >= 1 && (classes - 1) * width <= max && max < classes * width);
  return fits.length > 0 ? Math.min(...fits) : Math.max(1, Math.floor(max / (classes - 1)));
}

/** Kelas warna (0 sampai 3) satu angka. */
export const classOf = (count: number, width: number) => Math.min(RAMP.length - 1, Math.floor(count / width));

/** Rentang angka setiap kelas, untuk legenda dan tabel. Kelas tergelap selalu memuat angka terbesar. */
export const classRanges = (width: number, max = 0) =>
  RAMP.map((_, i) => ({ from: i * width, to: i === RAMP.length - 1 ? Math.max((i + 1) * width - 1, max) : (i + 1) * width - 1 }));
