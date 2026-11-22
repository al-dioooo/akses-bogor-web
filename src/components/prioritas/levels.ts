import type { PriorityLevel } from "@/lib/agen-rute";

/** Urutan tingkat prioritas dari yang paling rendah, untuk legenda dan kelas peta. */
export const LEVELS: PriorityLevel[] = ["rendah", "sedang", "tinggi", "sangat_tinggi"];

/**
 * Warna empat tingkat prioritas: skala ungu berurutan, terpisah dari warna status aksesibilitas supaya tidak tertukar.
 * Warna selalu ditemani teks tingkatnya, tidak pernah warna saja.
 */
export const LEVEL_COLOR: Record<PriorityLevel, string> = {
  rendah: "--violet-100",
  sedang: "--violet-300",
  tinggi: "--violet-500",
  sangat_tinggi: "--violet-800",
};
