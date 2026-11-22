import { connection } from "next/server";
import { apiHeaders, apiPost, apiUrl } from "./api";
import type { LatLng } from "./laporan";

// Agen rute (ADR-0042, ADR-0043). Tipe mengikuti docs/openapi.json di akses-bogor-api. Fungsi di sini hanya dipanggil
// di server web: route handler /lokasi/[id]/rute/* meneruskan permintaan browser ke API dengan token sesi.
// Rute dan hambatan hanya untuk ditampilkan kepada pengguna; posisi pengguna tidak pernah dikirim ke /agent/ask.

export type WalkingStep = { instruction: string; distanceMeters: number; durationSeconds: number; name: string | null; maneuver: string; location: LatLng };

export type WalkingRoute = {
  destination: { placeId: string; name: string; location: LatLng };
  distanceMeters: number;
  durationSeconds: number;
  steps: WalkingStep[];
  /** GeoJSON, koordinat [bujur, lintang]. */
  geometry: { type: "LineString"; coordinates: [number, number][] };
  /** Garis rute untuk meminta hambatan di dekatnya. */
  polyline: string;
  /** Kalimat peringatan tetap dari API; selalu ditampilkan bersama rute. */
  warning: string;
  attribution: string;
};

export type ObstacleKind = "tangga" | "lift" | "pintu_masuk" | "kerb" | "ramp" | "guiding_block" | "halte" | "tempat";

export type Obstacle = {
  kind: ObstacleKind;
  description: string;
  name: string | null;
  tags: Record<string, string>;
  distanceFromRouteMeters: number;
  alongRouteMeters: number;
  osm: { type: string; id: number; url: string };
};

export type RouteObstacles = { bufferMeters: number; truncated: boolean; features: Obstacle[]; note: string; attribution: string };

export type AgentTurn = { role: "user" | "assistant"; content: string };

export type AgentSource =
  | { type: "lokasi"; placeId: string; name: string; lastVerifiedAt: string }
  | { type: "pengetahuan"; citation: string; title: string; url: string; license: string; attribution: string | null };

export type AgentAnswer = { answer: string; sources: AgentSource[]; model: string | null };

export const walkingRoute = (token: string, input: { from: LatLng; placeId: string }) => apiPost<WalkingRoute>("/route/walking", { json: input }, token);

export const routeObstacles = (token: string, input: { polyline: string }) => apiPost<RouteObstacles>("/route/obstacles", { json: input }, token);

export const askAgent = (token: string, input: { placeId: string; question: string; history: AgentTurn[] }) =>
  apiPost<AgentAnswer>("/agent/ask", { json: input }, token);

/**
 * Apakah agen rute dibuka di API. Tanpa token, API menjawab 503 `agen_rute_belum_aktif` selama `ROUTE_AGENT_ENABLED`
 * mati, dan 401 bila sudah dibuka; jadi pemeriksaan ini tidak memakai batas per akun. API yang belum punya route agen
 * (404) atau tidak terhubung dianggap belum dibuka.
 */
export async function agentEnabled(): Promise<boolean> {
  await connection();
  try {
    const response = await fetch(apiUrl("/agent/tools"), { headers: await apiHeaders(), cache: "no-store" });
    return response.status === 401;
  } catch {
    return false;
  }
}
