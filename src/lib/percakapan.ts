import type { AgenCard } from "./agen";
import type { AgentSource, AgentTurn } from "./agen-rute";
import { historyFor } from "./agen-rute-isian";
import type { LatLng } from "./laporan";

// Percakapan Agen AI (ADR-0054) di sessionStorage tab ini saja: tetap ada saat halaman dimuat ulang atau pengguna
// kembali dari tautan kartu, dan hilang saat tab ditutup atau "Percakapan baru" dipilih. Server tidak menyimpannya.
// Titik awal pengunjung tidak pernah ikut disimpan. Tanpa next/server supaya bisa diimpor komponen klien.

export const STORAGE_KEY = "aksesbogor.agen-ai";
/** Pesan paling banyak yang disimpan; yang lebih lama hanya hilang dari tab ini. */
export const MAX_STORED = 40;

export type UserMessage = { id: string; role: "user"; content: string };
export type AgentMessage = {
  id: string;
  role: "agent";
  content: string;
  sources: AgentSource[];
  cards: AgenCard[];
  /** Titik awal saat pertanyaan dikirim, untuk kartu rute. Hanya di memori, tidak pernah disimpan. */
  from?: LatLng;
};
export type Message = UserMessage | AgentMessage;

type Storage = Pick<globalThis.Storage, "getItem" | "setItem" | "removeItem">;

const browserStorage = (): Storage | null => {
  try {
    return typeof window === "undefined" ? null : window.sessionStorage;
  } catch {
    return null;
  }
};

const isMessage = (value: unknown): value is Message => {
  const m = (value ?? {}) as Omit<Partial<AgentMessage>, "role"> & { role?: unknown };
  if (typeof m.id !== "string" || typeof m.content !== "string") return false;
  if (m.role === "user") return true;
  return m.role === "agent" && Array.isArray(m.sources) && Array.isArray(m.cards);
};

/** Percakapan tersimpan di tab ini, atau kosong bila tidak ada atau isinya tidak bisa dibaca. */
export function loadConversation(storage: Storage | null = browserStorage()): Message[] {
  try {
    const saved = JSON.parse(storage?.getItem(STORAGE_KEY) ?? "null") as { messages?: unknown } | null;
    const messages = Array.isArray(saved?.messages) ? saved.messages : [];
    return messages.every(isMessage) ? (messages as Message[]) : [];
  } catch {
    return [];
  }
}

/** Menyimpan percakapan tanpa titik awal. Penyimpanan yang penuh atau ditolak browser diabaikan. */
export function saveConversation(messages: Message[], storage: Storage | null = browserStorage()) {
  try {
    if (messages.length === 0) return storage?.removeItem(STORAGE_KEY);
    const kept = messages.slice(-MAX_STORED).map((message) => {
      if (message.role === "user") return message;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars -- titik awal sengaja dibuang.
      const { from, ...rest } = message;
      return rest;
    });
    storage?.setItem(STORAGE_KEY, JSON.stringify({ messages: kept }));
  } catch {
    // Mode privat atau kuota penuh: percakapan tetap ada di halaman ini.
  }
}

/** Giliran sebelumnya untuk API: paling banyak enam, dari pesan yang sudah terjawab. */
export const historyOf = (messages: Message[]): AgentTurn[] =>
  historyFor(messages.map((message) => ({ role: message.role === "user" ? "user" : "assistant", content: message.content })));

let counter = 0;
/** Id pesan untuk kunci React dan tautan fokus; cukup unik di satu tab. */
export const messageId = () => `pesan-${Date.now().toString(36)}-${(counter++).toString(36)}`;
