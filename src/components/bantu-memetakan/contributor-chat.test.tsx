import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { WithIntl } from "@/test/intl";
import { ContributorChat } from "./contributor-chat";

const ID = "4037ba19-b366-45bc-aceb-270944fe9372";
const ANSWER = {
  answer: "Ramp tersedia.\n- Guiding block: belum diketahui.",
  sources: [
    { type: "lokasi", placeId: ID, name: "Halte contoh", lastVerifiedAt: "2026-10-18T03:00:00.000Z" },
    { type: "pengetahuan", citation: "Rute BisKita Koridor 1", title: "Rute angkutan", url: "https://www.openstreetmap.org/relation/1", license: "ODbL 1.0", attribution: "© kontributor OpenStreetMap" },
  ],
  model: "tiruan/model:free",
  cards: [],
};

function mockFetch(...replies: { status: number; body: unknown }[]) {
  const fetch = vi.fn(async () => {
    const reply = replies.shift()!;
    return new Response(JSON.stringify(reply.body), { status: reply.status, headers: { "content-type": "application/json" } });
  });
  vi.stubGlobal("fetch", fetch);
  return fetch;
}

const ask = (text: string) => {
  fireEvent.change(screen.getByRole("textbox", { name: "Pertanyaan Anda" }), { target: { value: text } });
  fireEvent.click(screen.getByRole("button", { name: "Kirim pertanyaan" }));
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("ContributorChat", () => {
  it("shows the answer with its sources, announces it, and sends earlier turns without any position", async () => {
    const fetch = mockFetch({ status: 200, body: ANSWER }, { status: 200, body: { ...ANSWER, answer: "Lift tidak perlu." } });
    render(<ContributorChat />, { wrapper: WithIntl });

    ask("Ada ramp?");
    await waitFor(() => expect(screen.getByRole("list", { name: "Percakapan dengan agen" })).toBeTruthy());
    expect(screen.getByRole("list", { name: "Percakapan dengan agen" }).textContent).toContain("Guiding block: belum diketahui.");
    expect(screen.getByRole("link", { name: /Data terverifikasi AksesBogor: Halte contoh, diverifikasi 18 Oktober 2026/ }).getAttribute("href")).toBe(`/lokasi/${ID}`);
    expect(screen.getByText("Lisensi ODbL 1.0 · © kontributor OpenStreetMap")).toBeTruthy();
    expect(screen.getByRole("status").textContent).toContain("Agen menjawab: Ramp tersedia.");
    expect((screen.getByRole("textbox", { name: "Pertanyaan Anda" }) as HTMLTextAreaElement).value).toBe("");

    ask("Ada lift?");
    await waitFor(() => expect(screen.getByText("Lift tidak perlu.")).toBeTruthy());
    const [url, init] = fetch.mock.calls[1] as unknown as [string, RequestInit];
    expect(url).toBe("/laporkan/bantu-memetakan/tanya");
    expect(JSON.parse(init.body as string)).toEqual({
      question: "Ada lift?",
      history: [
        { role: "user", content: "Ada ramp?" },
        { role: "assistant", content: ANSWER.answer },
      ],
    });
  });

  it("keeps the question and shows the busy message when the agent is busy", async () => {
    mockFetch({ status: 503, body: { galat: "agen_sibuk", pesan: "Agen sedang sibuk, coba lagi nanti." } });
    render(<ContributorChat />, { wrapper: WithIntl });
    ask("Ada ramp?");
    await waitFor(() => expect(screen.getByRole("alert").textContent).toBe("Agen sedang sibuk, coba lagi nanti."));
    expect((screen.getByRole("textbox", { name: "Pertanyaan Anda" }) as HTMLTextAreaElement).value).toBe("Ada ramp?");
  });

  it("asks for a longer question before sending anything", () => {
    const fetch = mockFetch();
    render(<ContributorChat />, { wrapper: WithIntl });
    ask("x");
    expect(screen.getByRole("alert").textContent).toBe("Tulis pertanyaan paling sedikit 2 karakter.");
    expect(document.activeElement).toBe(screen.getByRole("textbox", { name: "Pertanyaan Anda" }));
    expect(fetch).not.toHaveBeenCalled();
  });
});
