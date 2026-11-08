import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { newDraft } from "@/lib/isian-laporan";
import type { PlaceDetail } from "@/lib/api";
import { WithIntl } from "@/test/intl";
import { ErrorSummary, Stepper } from "./form-parts";
import { StepInfo } from "./step-info";

const halte = {
  id: "22222222-2222-4222-8222-222222222222",
  name: "Halte contoh",
  category: "halte",
  district: { slug: "bogor-tengah", name: "Bogor Tengah" },
  location: { lat: -6.5958, lng: 106.7942 },
  landmark: null,
  description: null,
  facilities: [],
} as unknown as PlaceDetail;

describe("StepInfo", () => {
  it("links each error to its field and marks the field invalid", async () => {
    const update = vi.fn();
    const draft = { ...newDraft("baru", null), name: "x".repeat(121) };
    const errors = [
      { field: "nama", message: "terlaluPanjang" as const, values: { max: 120 } },
      { field: "kategori", message: "kategoriKosong" as const },
    ];
    render(
      <>
        <ErrorSummary errors={errors} />
        <StepInfo draft={draft} errors={errors} update={update} onNearbyPending={vi.fn()} />
      </>,
      { wrapper: WithIntl },
    );
    const name = screen.getByRole("textbox", { name: "Nama tempat" });
    expect(name.getAttribute("aria-invalid")).toBe("true");
    expect(name.getAttribute("aria-describedby")).toBe("nama-petunjuk nama-hitung nama-galat");
    expect(screen.getByText("121 dari 120 karakter")).toBeTruthy();
    expect(screen.getByRole("group", { name: "Kategori" }).getAttribute("aria-describedby")).toBe("kategori-petunjuk kategori-galat");
    await userEvent.setup().click(screen.getByRole("link", { name: "Pilih satu kategori." }));
    expect(document.activeElement?.id).toBe("kategori");
    await userEvent.setup().click(screen.getByRole("radio", { name: "Halte" }));
    expect(update).toHaveBeenCalledWith({ category: "halte" });
  });

  it("shows the place without fields for a gap report (FR-27)", () => {
    render(<StepInfo draft={newDraft("kekurangan", halte)} errors={[]} update={vi.fn()} onNearbyPending={vi.fn()} />, { wrapper: WithIntl });
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(screen.getByRole("heading", { name: "Tempat yang dilaporkan" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Edit lokasi Halte contoh" }).getAttribute("href")).toBe(`/laporkan?lokasi=${halte.id}`);
  });
});

describe("Stepper", () => {
  it("marks the current step with text, not only colour", () => {
    render(<Stepper step="2" />, { wrapper: WithIntl });
    const current = screen.getAllByRole("listitem")[1]!;
    expect(current.getAttribute("aria-current")).toBe("step");
    expect(current.textContent).toBe("Fasilitas(langkah ini)");
    expect(screen.getAllByRole("listitem")[0]!.textContent).toBe("Informasi dan lokasi(sudah diisi)");
  });
});
