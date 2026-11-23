import { connection } from "next/server";
import { cache } from "react";
import type { AgentSource, AgentTurn, CardTarget, RouteObstacles, RouteTarget, WalkingRoute } from "./agen-rute";
import { apiHeaders, apiPost, apiUrl } from "./api";
import type { LatLng } from "./laporan";

// Asisten rute publik (ADR-0050): siapa pun, dengan atau tanpa akun, bertanya cara ke lokasi AksesBogor. Tipe mengikuti
// docs/openapi.json di akses-bogor-api. Fungsi di sini hanya dipanggil di server web: route handler /tanya-rute/*
// meneruskan permintaan browser ke API dengan token sesi bila ada, dan dengan IP pengunjung lewat `apiHeaders`.
// Titik awal pengunjung hanya dipakai server API untuk tempat terdekat dan rute; tidak pernah dikirim ke model.

/** Kartu rute dari jawaban asisten: hanya tujuan. Web menghitung rutenya sendiri dari titik awal pengunjung. */
/** Kartu rute ke lokasi AksesBogor, atau ke kandidat OpenStreetMap yang belum punya data aksesibilitas (ADR-0049). */
export type AssistantCard = { type: "rute"; target: CardTarget; name: string | null };

export type AssistantAnswer = { answer: string; sources: AgentSource[]; model: string | null; cards: AssistantCard[] };

export type AssistantQuestion = { question: string; history: AgentTurn[]; placeId?: string; from?: LatLng };

export type AssistantStatus = { enabled: boolean; questionsPerDay: number };

export const askAssistant = (token: string | null, input: AssistantQuestion) =>
  apiPost<AssistantAnswer>("/route-assistant/ask", { json: input }, token ?? undefined);

export const visitorWalkingRoute = (token: string | null, input: { from: LatLng } & RouteTarget) =>
  apiPost<WalkingRoute>("/route/walking", { json: input }, token ?? undefined);

export const visitorRouteObstacles = (token: string | null, input: { polyline: string }) =>
  apiPost<RouteObstacles>("/route/obstacles", { json: input }, token ?? undefined);

/**
 * Apakah asisten dibuka di API, dibaca sekali per request. API yang belum punya route ini (404), menjawab galat, atau
 * tidak terhubung dianggap belum dibuka.
 */
export const assistantStatus = cache(async (): Promise<AssistantStatus | null> => {
  await connection();
  try {
    const response = await fetch(apiUrl("/route-assistant/status"), { headers: await apiHeaders(), cache: "no-store" });
    if (!response.ok) return null;
    const body = (await response.json()) as Partial<AssistantStatus>;
    return typeof body.enabled === "boolean" ? { enabled: body.enabled, questionsPerDay: Number(body.questionsPerDay ?? 0) } : null;
  } catch {
    return null;
  }
});
