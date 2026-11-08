import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { newDraft, type ReportDraft } from "@/lib/isian-laporan";
import { WithIntl } from "@/test/intl";
import { StepSummary } from "./step-summary";

const filled = (): ReportDraft => {
  const draft = newDraft("baru", null);
  draft.name = "Masjid Al-Ikhlas contoh";
  draft.category = "masjid";
  draft.location = { point: { lat: -6.5976, lng: 106.7991 }, district: { slug: "bogor-tengah", name: "Bogor Tengah" } };
  draft.facilities.lift = { answer: "tidak_tersedia", reason: "rusak", note: "Mati sejak Oktober" };
  draft.photos = [{ key: "f1", blob: new Blob(["x"]), name: "pintu.jpg", width: 10, height: 10, tag: "pintu_masuk", caption: "Dari tepi jalan", uploadedId: null }];
  return draft;
};

describe("StepSummary", () => {
  it("shows every answer with a way back to its step", async () => {
    const goTo = vi.fn();
    render(<StepSummary draft={filled()} signedIn goTo={goTo} onDelete={vi.fn()} />, { wrapper: WithIntl });
    expect(screen.queryByText(/belum lengkap/)).toBeNull();
    expect(screen.getByText("Kecamatan Bogor Tengah · -6,59760, 106,79910")).toBeTruthy();
    expect(screen.getByText("Tidak tersedia · Rusak")).toBeTruthy();
    expect(screen.getByText("Catatan: Mati sejak Oktober")).toBeTruthy();
    expect(screen.getByText(/Foto 1: Pintu masuk dan ramp/)).toBeTruthy();
    expect(screen.queryByText(/Anda akan diminta masuk/)).toBeNull();
    await userEvent.setup().click(screen.getByRole("button", { name: "Ubah Fasilitas" }));
    expect(goTo).toHaveBeenCalledWith("2");
  });

  it("points to the first incomplete step and warns about signing in", async () => {
    const goTo = vi.fn();
    render(<StepSummary draft={newDraft("baru", null)} signedIn={false} goTo={goTo} onDelete={vi.fn()} />, { wrapper: WithIntl });
    expect(screen.getByText("Langkah 1 belum lengkap.")).toBeTruthy();
    expect(screen.getByText(/Anda akan diminta masuk sebelum laporan dikirim/)).toBeTruthy();
    await userEvent.setup().click(screen.getByRole("button", { name: "Lengkapi langkah 1" }));
    expect(goTo).toHaveBeenCalledWith("1");
  });

  it("asks before deleting the draft", async () => {
    const onDelete = vi.fn();
    render(<StepSummary draft={filled()} signedIn goTo={vi.fn()} onDelete={onDelete} />, { wrapper: WithIntl });
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Hapus draf" }));
    await user.click(screen.getByRole("button", { name: "Batal" }));
    expect(onDelete).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Hapus draf" }));
    await user.click(screen.getByRole("button", { name: "Ya, hapus draf" }));
    expect(onDelete).toHaveBeenCalled();
  });
});
