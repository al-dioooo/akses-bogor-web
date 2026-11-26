import type { RouteTarget } from "./agen-rute";
import { ApiError, apiPost } from "./api";
import type { LatLng } from "./laporan";
import { ACCESSIBLE_OFF, type AccessibleProfile, type AccessibleRoute } from "./rute-aksesibel";

/**
 * Rute OSM (ADR-0055) untuk route handler rute di server web, dengan token sesi bila ada. Titik awal hanya diteruskan
 * ke API, yang membulatkannya untuk Valhalla di server AksesBogor sendiri.
 *
 * API yang belum punya route ini menjawab 404 `tidak_ditemukan`; jawaban itu dijadikan "belum aktif", supaya kartu rute
 * tetap memakai rute Mapbox bila web dirilis lebih dulu.
 */
export async function accessibleRoute(token: string | null, input: { from: LatLng; profil: AccessibleProfile } & RouteTarget) {
  try {
    return await apiPost<AccessibleRoute>("/route/accessible", { json: input }, token ?? undefined);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404 && error.galat === "tidak_ditemukan") {
      throw new ApiError(503, ACCESSIBLE_OFF, "Rute dari data OpenStreetMap belum tersedia di server.");
    }
    throw error;
  }
}
