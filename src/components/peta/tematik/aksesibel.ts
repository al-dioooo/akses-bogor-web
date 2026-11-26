import type { DistrictAccessibility } from "@/lib/api";
import { RAMP } from "./disabilitas";

type District = DistrictAccessibility["districts"][number];

/** Kelas warna skor (0–24, 25–49, 50–74, 75–100), sama dengan ambang di ADR-0053. */
export const scoreClass = (score: number) => Math.min(RAMP.length - 1, Math.floor(score / 25));

/** Rentang skor setiap kelas warna, untuk legenda. */
export const SCORE_RANGES = RAMP.map((_, i) => ({ from: i * 25, to: i === RAMP.length - 1 ? 100 : i * 25 + 24 }));

/** Tempat ber-keterangan yang keterangannya dari pihak ketiga, jadi belum diperiksa tim. */
export const unverified = (district: Pick<District, "withData" | "bySource">) => district.withData - district.bySource.aksesbogor.withData;

/** Jumlah untuk seluruh kota, untuk kalimat cakupan di kunci. */
export function cityTotals(data: DistrictAccessibility) {
  const sum = (pick: (d: District) => number) => data.districts.reduce((total, d) => total + pick(d), 0);
  return {
    places: sum((d) => d.places),
    withData: sum((d) => d.withData),
    unverified: sum(unverified),
    openstreetmap: sum((d) => d.bySource.openstreetmap.withData),
    google: sum((d) => d.bySource.google_maps.withData),
  };
}

/** Kecamatan berperingkat dulu menurut peringkat, lalu yang datanya belum cukup menurut nama. */
export function ranked(data: DistrictAccessibility) {
  const withRank = data.districts.filter((d) => d.rank !== null).sort((a, b) => a.rank! - b.rank!);
  const without = data.districts.filter((d) => d.rank === null).sort((a, b) => a.name.localeCompare(b.name, "id"));
  return { withRank, without };
}
