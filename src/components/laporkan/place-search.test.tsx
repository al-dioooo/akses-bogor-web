import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WithIntl } from "@/test/intl";
import { PlaceSearch } from "./place-search";

const SEARCH = {
  places: [{ id: "22222222-2222-4222-8222-222222222222", name: "Halte contoh", category: "halte", status: "sebagian", district: { slug: "bogor-tengah", name: "Bogor Tengah" }, location: { lat: -6.5958, lng: 106.7942 } }],
  results: [{ name: "Stasiun Bogor", address: "Jl. Nyi Raja Permas, Kota Bogor", location: { lat: -6.5953, lng: 106.7905 }, kind: "poi" }],
};
let answer: () => Response;
const bodies: unknown[] = [];

beforeEach(() => {
  bodies.length = 0;
  answer = () => Response.json(SEARCH);
  vi.stubGlobal("fetch", async (_url: string, init: RequestInit) => {
    bodies.push(JSON.parse(String(init.body)));
    return answer();
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("PlaceSearch", () => {
  it("lists AksesBogor places first and picks a result with the keyboard", async () => {
    const onPick = vi.fn();
    render(<PlaceSearch near={{ lat: -6.6, lng: 106.8 }} onPick={onPick} />, { wrapper: WithIntl });
    const user = userEvent.setup();
    const box = screen.getByRole("combobox", { name: "Cari nama tempat atau alamat" });
    await user.type(box, "bogor{Enter}");
    expect(await screen.findByRole("status")).toHaveProperty("textContent", "2 hasil untuk “bogor”. Pilih dengan tombol panah atau ketuk hasilnya.");
    expect(screen.getAllByRole("option").map((option) => option.textContent)).toEqual([
      "Halte contoh, Bogor Tengah (sudah ada di AksesBogor)",
      "Stasiun BogorJl. Nyi Raja Permas, Kota Bogor",
    ]);
    await user.keyboard("{ArrowUp}");
    expect(box.getAttribute("aria-activedescendant")).toBe(screen.getAllByRole("option")[1]!.id);
    await user.keyboard("{Escape}");
    expect(box.getAttribute("aria-expanded")).toBe("false");
    await user.keyboard("{ArrowDown}{Enter}");
    expect(onPick).toHaveBeenCalledWith({ name: "Halte contoh", detail: "Bogor Tengah", point: { lat: -6.5958, lng: 106.7942 }, existingId: SEARCH.places[0]!.id });
    expect(bodies[0]).toEqual({ q: "bogor", near: { lat: -6.6, lng: 106.8 } });
  });

  it("does not search fewer than 3 letters and reports API problems", async () => {
    answer = () => Response.json({ galat: "pencarian_penuh", pesan: "Pencarian tempat sudah mencapai batas hari ini." }, { status: 503 });
    render(<PlaceSearch near={null} onPick={vi.fn()} />, { wrapper: WithIntl });
    const user = userEvent.setup();
    await user.type(screen.getByRole("combobox"), "ha{Enter}");
    expect(bodies).toEqual([]);
    await user.type(screen.getByRole("combobox"), "l{Enter}");
    expect(await screen.findByText("Pencarian tempat sudah mencapai batas hari ini.")).toBeTruthy();
    expect(screen.queryAllByRole("option")).toEqual([]);
  });
});
