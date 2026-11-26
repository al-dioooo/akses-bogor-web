import type { RouteTarget } from "./agen-rute";
import { apiPost } from "./api";
import type { LatLng } from "./laporan";
import type { AccessibleProfile, AccessibleRoute } from "./rute-aksesibel";

/**
 * Rute OSM (ADR-0055) untuk route handler rute di server web, dengan token sesi bila ada. Titik awal hanya diteruskan
 * ke API, yang membulatkannya untuk Valhalla di server AksesBogor sendiri.
 */
export const accessibleRoute = (token: string | null, input: { from: LatLng; profil: AccessibleProfile } & RouteTarget) =>
  apiPost<AccessibleRoute>("/route/accessible", { json: input }, token ?? undefined);
