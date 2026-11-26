import type { AgentCard, AgentSource, AgentTurn } from "./agen-rute";
import { apiPost } from "./api";
import type { LatLng } from "./laporan";

// Agen AI (ADR-0054): satu agen obrolan untuk semua pengunjung. Pertanyaan diteruskan ke asisten rute publik di API
// (`POST /route-assistant/ask`, ADR-0050). Selama ada sesi, web meminta alat kontributor dengan `contributorTools`; API
// sendiri yang memeriksa apakah akunnya lengkap dan agen kontributor dibuka. Hanya dipanggil di server web. Titik awal
// pengunjung hanya dipakai server API untuk tempat terdekat dan tidak pernah dikirim ke model.

/** Kartu di bawah jawaban: rute, dan tempat atau prioritas kecamatan bila alat kontributor dipakai. */
export type AgenCard = AgentCard;

export type AgenAnswer = { answer: string; sources: AgentSource[]; model: string | null; cards: AgenCard[] };

export type AgenQuestion = { question: string; history: AgentTurn[]; placeId?: string; from?: LatLng };

export const askAgen = (token: string | null, input: AgenQuestion) =>
  apiPost<AgenAnswer>("/route-assistant/ask", { json: token ? { ...input, contributorTools: true } : input }, token ?? undefined);
