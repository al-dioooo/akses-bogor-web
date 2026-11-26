import { describe, expect, it } from "vitest";
import { historyOf, loadConversation, MAX_STORED, messageId, saveConversation, STORAGE_KEY, type Message } from "./percakapan";

function memoryStorage() {
  const items = new Map<string, string>();
  return {
    items,
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => void items.set(key, value),
    removeItem: (key: string) => void items.delete(key),
  };
}

const question: Message = { id: "1", role: "user", content: "Halte terdekat?" };
const answer: Message = {
  id: "2",
  role: "agent",
  content: "Halte contoh sekitar 300 m garis lurus.",
  sources: [],
  cards: [{ type: "rute", target: { kind: "aksesbogor", placeId: "4037ba19-b366-45bc-aceb-270944fe9372" }, name: "Halte contoh" }],
  from: { lat: -6.5965, lng: 106.7972 },
};

describe("conversation storage", () => {
  it("keeps the conversation in this tab and reads it back", () => {
    const storage = memoryStorage();
    saveConversation([question, answer], storage);
    const { from, ...withoutStart } = answer;
    expect(from).toBeDefined();
    expect(loadConversation(storage)).toEqual([question, withoutStart]);
  });

  it("never stores the start point", () => {
    const storage = memoryStorage();
    saveConversation([question, answer], storage);
    expect(storage.items.get(STORAGE_KEY)).not.toMatch(/-6\.59|106\.79|"from"/);
  });

  it("forgets everything when the conversation is emptied", () => {
    const storage = memoryStorage();
    saveConversation([question, answer], storage);
    saveConversation([], storage);
    expect(storage.items.has(STORAGE_KEY)).toBe(false);
    expect(loadConversation(storage)).toEqual([]);
  });

  it("keeps only the newest messages", () => {
    const storage = memoryStorage();
    const many: Message[] = Array.from({ length: MAX_STORED + 6 }, (_, i) => ({ id: String(i), role: "user", content: `Pesan ${i}` }));
    saveConversation(many, storage);
    const loaded = loadConversation(storage);
    expect(loaded).toHaveLength(MAX_STORED);
    expect(loaded[0]!.content).toBe("Pesan 6");
  });

  it("starts empty when the stored value is missing, broken, or has the wrong shape", () => {
    const storage = memoryStorage();
    expect(loadConversation(storage)).toEqual([]);
    storage.setItem(STORAGE_KEY, "{bukan json");
    expect(loadConversation(storage)).toEqual([]);
    storage.setItem(STORAGE_KEY, JSON.stringify({ messages: [{ id: "1", role: "sistem", content: "x" }] }));
    expect(loadConversation(storage)).toEqual([]);
    expect(loadConversation(null)).toEqual([]);
  });

  it("ignores a storage that refuses to save", () => {
    const full = { ...memoryStorage(), setItem: () => { throw new Error("QuotaExceededError"); } };
    expect(() => saveConversation([question], full)).not.toThrow();
  });
});

describe("historyOf", () => {
  it("sends at most six earlier turns with the API role names", () => {
    const messages: Message[] = Array.from({ length: 8 }, (_, i) =>
      i % 2 === 0 ? { id: String(i), role: "user", content: `Tanya ${i}` } : { id: String(i), role: "agent", content: `Jawab ${i}`, sources: [], cards: [] },
    );
    const history = historyOf(messages);
    expect(history).toHaveLength(6);
    expect(history[0]).toEqual({ role: "user", content: "Tanya 2" });
    expect(history.at(-1)).toEqual({ role: "assistant", content: "Jawab 7" });
  });
});

describe("messageId", () => {
  it("gives a new id each time", () => {
    expect(messageId()).not.toBe(messageId());
  });
});
