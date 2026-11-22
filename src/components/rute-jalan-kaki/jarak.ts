import type { useFormatter } from "next-intl";

type Formatter = ReturnType<typeof useFormatter>;

/** Jarak untuk dibaca orang: meter dibulatkan ke 10 m di bawah 1 km, lalu kilometer dengan satu desimal. */
export function distanceText(format: Formatter, meters: number) {
  if (meters < 1000) return format.number(meters < 10 ? Math.round(meters) : Math.round(meters / 10) * 10, { style: "unit", unit: "meter" });
  return format.number(meters / 1000, { style: "unit", unit: "kilometer", maximumFractionDigits: 1 });
}

/** Menit jalan kaki, paling sedikit 1. */
export const walkingMinutes = (seconds: number) => Math.max(1, Math.round(seconds / 60));
