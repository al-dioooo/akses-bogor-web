import type { CityOutline } from "@/lib/api";

type Ring = [number, number][];

/**
 * Kotak di luar AREA peta (mount.ts), supaya tepi lapisan "luar kota" tidak pernah terlihat, juga saat peta digeser ke
 * batasnya pada zoom terkecil.
 */
const WORLD: Ring = [
  [105.5, -8],
  [108.1, -8],
  [108.1, -5.2],
  [105.5, -5.2],
  [105.5, -8],
];

/** Luas bertanda cincin (rumus shoelace); tandanya menunjukkan arah putaran. */
export function signedArea(ring: Ring): number {
  let sum = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) sum += (ring[j]![0] - ring[i]![0]) * (ring[j]![1] + ring[i]![1]);
  return sum / 2;
}

const turned = (ring: Ring, positive: boolean): Ring => ((signedArea(ring) > 0) === positive ? ring : [...ring].reverse());

/**
 * Area di luar Kota Bogor sebagai satu poligon: kotak besar dengan garis luar kota sebagai lubangnya (ADR-0053). Mapbox
 * membedakan lubang dari arah putarannya, jadi lubang selalu berputar berlawanan dengan cincin luarnya.
 */
export function outsideCity(outline: CityOutline): { type: "Polygon"; coordinates: Ring[] } {
  const holes = outline.coordinates.map((polygon) => polygon[0]).filter((ring): ring is Ring => !!ring && ring.length >= 4);
  return { type: "Polygon", coordinates: [turned(WORLD, true), ...holes.map((ring) => turned(ring, false))] };
}
