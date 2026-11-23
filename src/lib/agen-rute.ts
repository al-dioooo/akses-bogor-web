import { connection } from "next/server";
import { cache } from "react";
import { apiHeaders, apiPost, apiUrl, type Category, type DistrictPriority, type Status } from "./api";
import type { LatLng } from "./laporan";

// Agen bantu memetakan (ADR-0042, ADR-0043): agen yang membantu kontributor menemukan fasilitas publik yang belum punya
// data AksesBogor, dan rute jalan kaki yang ditampilkan aplikasi. Tipe mengikuti docs/openapi.json di akses-bogor-api.
// Fungsi di sini hanya dipanggil di server web: route handler /laporkan/bantu-memetakan/* meneruskan permintaan browser
// ke API dengan token sesi. Posisi pengguna hanya dikirim ke rute jalan kaki, tidak pernah ke /agent/ask.

export type WalkingStep = { instruction: string; distanceMeters: number; durationSeconds: number; name: string | null; maneuver: string; location: LatLng };

export type WalkingRoute = {
  /** Lokasi AksesBogor (`placeId`) atau fasilitas OpenStreetMap (`osm`); yang lain bernilai null. */
  destination: { placeId: string | null; osm: { type: OsmType; id: number } | null; name: string | null; location: LatLng };
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

export type OsmType = "node" | "way" | "relation";

/** Tujuan sebuah kartu: lokasi AksesBogor, atau fasilitas OpenStreetMap yang belum punya data AksesBogor. */
export type CardTarget = { kind: "aksesbogor"; placeId: string } | { kind: "osm"; osmType: OsmType; osmId: number };

export type District = { slug: string; name: string };

export type { DistrictPriority, PriorityLevel } from "./api";

export type AgentCard =
  | { type: "tempat"; target: { kind: "aksesbogor"; placeId: string }; name: string; category: Category; district: District; status: Status; lastVerifiedAt: string; verifiedBy?: "tim" | "admin" }
  | { type: "tempat"; target: { kind: "osm"; osmType: OsmType; osmId: number }; name: string | null; category: Category; district: District; location: LatLng; osmUrl: string; attribution: string }
  | { type: "rute"; target: CardTarget; name: string | null }
  | ({ type: "prioritas" } & DistrictPriority);

export type AgentTurn = { role: "user" | "assistant"; content: string };

export type AgentSource =
  | { type: "lokasi"; placeId: string; name: string; lastVerifiedAt: string; verifiedBy?: "tim" | "admin" }
  | { type: "pengetahuan"; citation: string; title: string; url: string; license: string; attribution: string | null };

export type AgentAnswer = { answer: string; sources: AgentSource[]; model: string | null; cards: AgentCard[] };

/** Tujuan rute jalan kaki dalam bentuk badan API. */
export type RouteTarget = { placeId: string } | { osm: { type: OsmType; id: number } };

export const walkingRoute = (token: string, input: { from: LatLng } & RouteTarget) => apiPost<WalkingRoute>("/route/walking", { json: input }, token);

export const routeObstacles = (token: string, input: { polyline: string }) => apiPost<RouteObstacles>("/route/obstacles", { json: input }, token);

export const askAgent = (token: string, input: { question: string; history: AgentTurn[]; placeId?: string }) =>
  apiPost<AgentAnswer>("/agent/ask", { json: input }, token);

/**
 * Apakah agen dibuka di API. Tanpa token, API menjawab 503 `agen_rute_belum_aktif` selama `ROUTE_AGENT_ENABLED`
 * mati, dan 401 bila sudah dibuka; jadi pemeriksaan ini tidak memakai batas per akun. API yang belum punya route agen
 * (404) atau tidak terhubung dianggap belum dibuka. Dibaca sekali per request, karena menu dasbor dan beberapa bagian
 * Ringkasan menanyakannya (ADR-0046).
 */
export const agentEnabled = cache(async (): Promise<boolean> => {
  await connection();
  try {
    const response = await fetch(apiUrl("/agent/tools"), { headers: await apiHeaders(), cache: "no-store" });
    return response.status === 401;
  } catch {
    return false;
  }
});
