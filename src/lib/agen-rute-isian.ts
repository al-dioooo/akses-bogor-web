import type { AgentTurn, RouteTarget } from "./agen-rute";
import type { LatLng } from "./laporan";

// Batas isian agen bantu memetakan yang sama dengan API (ADR-0043), dipakai browser dan route handler web. Tanpa
// next/server supaya bisa diimpor komponen klien.

export const MAX_QUESTION = 500;
/** Giliran sebelumnya yang dikirim bersama pertanyaan; sisanya hanya tampil di layar. */
export const MAX_HISTORY = 6;
export const MAX_TURN = 1000;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isPlaceId = (value: string) => UUID.test(value);

/** Titik dengan lintang dan bujur yang masuk akal; selebihnya diperiksa API. */
export function pointFrom(value: unknown): LatLng | null {
  const { lat, lng } = (value ?? {}) as Partial<LatLng>;
  if (typeof lat !== "number" || typeof lng !== "number" || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat, lng };
}

/** Giliran terakhir yang dikirim ke API: paling banyak enam, masing-masing dipotong ke 1.000 karakter. */
export function historyFor(turns: AgentTurn[]): AgentTurn[] {
  return turns
    .filter((turn) => turn.content.trim())
    .slice(-MAX_HISTORY)
    .map((turn) => ({ role: turn.role, content: turn.content.trim().slice(0, MAX_TURN) }));
}

/** Pertanyaan, giliran sebelumnya, dan id lokasi opsional dari badan permintaan browser, atau null bila bentuknya salah. */
export function askFrom(body: unknown): { question: string; history: AgentTurn[]; placeId?: string } | null {
  const { question, history = [], placeId } = (body ?? {}) as { question?: unknown; history?: unknown; placeId?: unknown };
  if (typeof question !== "string" || question.trim().length < 2 || question.trim().length > MAX_QUESTION) return null;
  if (!Array.isArray(history)) return null;
  if (placeId !== undefined && (typeof placeId !== "string" || !isPlaceId(placeId))) return null;
  const turns: AgentTurn[] = [];
  for (const turn of history as unknown[]) {
    const { role, content } = (turn ?? {}) as { role?: unknown; content?: unknown };
    if ((role !== "user" && role !== "assistant") || typeof content !== "string") return null;
    turns.push({ role, content });
  }
  return { question: question.trim(), history: historyFor(turns), ...(placeId ? { placeId } : {}) };
}

const OSM_TYPES = new Set(["node", "way", "relation"]);

/** Tujuan rute dari badan permintaan: `{ placeId }` atau `{ osm: { type, id } }`, atau null bila bentuknya salah. */
export function routeTargetFrom(body: unknown): RouteTarget | null {
  const { placeId, osm } = (body ?? {}) as { placeId?: unknown; osm?: { type?: unknown; id?: unknown } };
  if (typeof placeId === "string" && osm === undefined) return isPlaceId(placeId) ? { placeId } : null;
  if (placeId === undefined && typeof osm?.type === "string" && OSM_TYPES.has(osm.type) && Number.isSafeInteger(osm.id) && (osm.id as number) > 0) {
    return { osm: { type: osm.type as "node" | "way" | "relation", id: osm.id as number } };
  }
  return null;
}
