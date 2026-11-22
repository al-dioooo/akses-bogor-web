import { describe, expect, it } from "vitest";
import { askFrom, historyFor, isPlaceId, MAX_HISTORY, MAX_TURN, pointFrom } from "./agen-rute-isian";

describe("pointFrom", () => {
  it("accepts finite coordinates and refuses the rest", () => {
    expect(pointFrom({ lat: -6.5958, lng: 106.7942 })).toEqual({ lat: -6.5958, lng: 106.7942 });
    for (const value of [null, {}, { lat: "-6.5", lng: 106.8 }, { lat: Number.NaN, lng: 106.8 }, { lat: -91, lng: 106.8 }]) {
      expect(pointFrom(value)).toBeNull();
    }
  });
});

describe("historyFor", () => {
  it("keeps the last six non-empty turns, each cut to 1,000 characters", () => {
    const turns = Array.from({ length: 9 }, (_, i) => ({ role: i % 2 ? ("assistant" as const) : ("user" as const), content: `giliran ${i}` }));
    const kept = historyFor([...turns, { role: "assistant", content: "  " }, { role: "user", content: "x".repeat(1500) }]);
    expect(kept).toHaveLength(MAX_HISTORY);
    expect(kept.at(-1)!.content).toHaveLength(MAX_TURN);
    expect(kept[0]!.content).toBe("giliran 4");
  });
});

describe("askFrom", () => {
  it("reads the question and history, and never passes anything else on", () => {
    const parsed = askFrom({ question: "  Ada ramp?  ", history: [{ role: "user", content: "Halo" }], from: { lat: -6.6, lng: 106.8 } });
    expect(parsed).toEqual({ question: "Ada ramp?", history: [{ role: "user", content: "Halo" }] });
  });

  it("refuses short or long questions and odd history", () => {
    for (const body of [{ question: "x" }, { question: "a".repeat(501) }, { question: "Ada ramp?", history: "halo" }, { question: "Ada ramp?", history: [{ role: "system", content: "x" }] }]) {
      expect(askFrom(body)).toBeNull();
    }
  });
});

describe("isPlaceId", () => {
  it("accepts only UUIDs", () => {
    expect(isPlaceId("4037ba19-b366-45bc-aceb-270944fe9372")).toBe(true);
    expect(isPlaceId("../agent/ask")).toBe(false);
  });
});
