// Warna adegan "Halte ke pintu" (ADR-0028), mengikuti Fondasi Visual: Ungu Inklusi untuk arsitektur dan pagar,
// kertas dan krim untuk tanah dan dinding, kuning guiding block, hijau angkot, dan beberapa warna pakaian.

export const C = {
  violet: "#6440E8",
  violetDeep: "#4A2DBF",
  lavender: "#B8A4FF",
  lavenderPale: "#EAE4FF",
  wall: "#F7F2E8",
  cream: "#F1ECDF",
  creamDeep: "#E3D9C4",
  pave: "#EDE6D6",
  pave2: "#E8E0CC",
  kerb: "#FBF9F3",
  ramp: "#ECE4F8",
  yellow: "#F2C230",
  angkot: "#1E9E6E",
  angkotDeep: "#147552",
  grass: "#B5D68F",
  hills: ["#9CC48A", "#A9CC93", "#93BC86", "#B0D09A", "#A3C98C"],
  leaf: ["#62A85E", "#4E9656", "#7FBA67", "#3F8550", "#8CC36F"],
  trunk: "#8B6B50",
  asphalt: "#5A5D71",
  line: "#F4F1E8",
  white: "#FFFFFF",
  ink: "#2C2E3D",
  glass: "#BFE1F4",
  vehicleGlass: "#9FC9E3",
  solar: "#5468A8",
  rain: "#7FA9D8",
  skin: ["#E3B18B", "#C68E6B", "#9C6A4C"],
  hair: "#2B2321",
  cloth: { red: "#E3705F", blue: "#3F72D6", teal: "#2F9C8E", pink: "#EFA2B6", mustard: "#E6B23A", olive: "#7E8F4E", plum: "#9A7BE8" },
  trousers: { slate: "#3B3F55", navy: "#454A63", lilac: "#8E6FD8", charcoal: "#4A4E66", indigo: "#6B57B8" },
  warm: { window: "#FFC56E", lamp: "#FFE2A0", ceiling: "#FFF7E0", headlight: "#FFF0B0", headlightBody: "#FFF4C8" },
} as const;

/** Lama satu siklus cerita dalam detik: angkot datang, penumpang turun dan menyeberang, angkot pergi. */
export const PERIOD = 32;

export type Rand = () => number;

/** Angka acak yang bisa diulang (mulberry32), supaya pohon dan semak ada di tempat yang sama di setiap render. */
export function rng(seed: number): Rand {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
