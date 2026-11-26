import type { WalkingRoute } from "./agen-rute";

// Rute pejalan kaki dari data OpenStreetMap lewat Valhalla di server API (ADR-0055). Tipe mengikuti docs/openapi.json di
// akses-bogor-api (POST /route/accessible). Tanpa modul server supaya bisa diimpor komponen klien; panggilan API-nya
// ada di rute-aksesibel-api.ts.

export const ACCESSIBLE_PROFILES = ["kursi_roda", "jalan_kaki"] as const;
export type AccessibleProfile = (typeof ACCESSIBLE_PROFILES)[number];

/** Cakupan data OSM di sepanjang rute; semua null bila API tidak bisa menghitungnya. */
export type RouteCoverage = {
  sidewalkPercent: number | null;
  surfacePercent: number | null;
  crossings: number | null;
  crossingsWithKerb: number | null;
  dataDate: string | null;
};

export type RouteWarning = { code: string; message: string };

/** Rute OSM: sama dengan rute Mapbox, tanpa `warning` tetap, ditambah profil, cakupan data, peringatan, dan label tetap. */
export type AccessibleRoute = Omit<WalkingRoute, "warning"> & {
  profil: AccessibleProfile;
  coverage: RouteCoverage;
  warnings: RouteWarning[];
  /** "Dihitung dari data OpenStreetMap; kondisi lapangan bisa berbeda." Selalu ditampilkan bersama rute. */
  note: string;
};

/** Galat API selama `ACCESSIBLE_ROUTER_URL` kosong: kartu rute lalu memakai rute Mapbox seperti sebelumnya. */
export const ACCESSIBLE_OFF = "rute_aksesibel_belum_aktif";

export const isAccessibleRoute = (route: WalkingRoute | AccessibleRoute): route is AccessibleRoute => "profil" in route;

/** `profil` dari badan permintaan browser: undefined bila tidak ada (rute Mapbox), null bila nilainya salah. */
export function profileFrom(body: unknown): AccessibleProfile | null | undefined {
  const value = (body as { profil?: unknown } | null)?.profil;
  if (value === undefined) return undefined;
  return ACCESSIBLE_PROFILES.includes(value as AccessibleProfile) ? (value as AccessibleProfile) : null;
}
