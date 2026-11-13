import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { newDraft, type ReportDraft } from "@/lib/isian-laporan";
import { WithIntl } from "@/test/intl";
import { StepFacilities } from "./step-facilities";

function Harness({ onChange }: { onChange?: (draft: ReportDraft) => void }) {
  const [draft, setDraft] = useState(newDraft("baru", null));
  return (
    <StepFacilities
      draft={draft}
      errors={[]}
      update={(change) => {
        const next = { ...draft, ...change };
        setDraft(next);
        onChange?.(next);
      }}
    />
  );
}

describe("StepFacilities", () => {
  it("starts every facility at Belum tahu (ADR-0017)", () => {
    render(<Harness />, { wrapper: WithIntl });
    const groups = screen.getAllByRole("group", { name: /^Jawaban untuk/ });
    expect(groups).toHaveLength(4);
    for (const group of groups) expect(within(group).getByRole("radio", { name: /Belum tahu/ })).toHaveProperty("checked", true);
  });

  it("asks for an optional reason only while Tidak tersedia is chosen (ADR-0022)", async () => {
    let latest: ReportDraft | undefined;
    render(<Harness onChange={(draft) => (latest = draft)} />, { wrapper: WithIntl });
    const user = userEvent.setup();
    const lift = screen.getByRole("group", { name: "Jawaban untuk Lift / Elevator" });
    expect(screen.queryByRole("group", { name: "Alasan tidak tersedia (opsional)" })).toBeNull();
    await user.click(within(lift).getByRole("radio", { name: /^Tidak tersedia/ }));
    const reasons = screen.getByRole("group", { name: "Alasan tidak tersedia (opsional)" });
    expect(within(reasons).getByRole("radio", { name: "Lewati" })).toHaveProperty("checked", true);
    await user.click(within(reasons).getByRole("radio", { name: /^Rusak/ }));
    expect(latest!.facilities.lift).toEqual({ answer: "tidak_tersedia", reason: "rusak", note: "" });
    await user.click(within(lift).getByRole("radio", { name: /^Tersedia/ }));
    expect(latest!.facilities.lift).toEqual({ answer: "tersedia", reason: null, note: "" });
    expect(screen.queryByRole("group", { name: "Alasan tidak tersedia (opsional)" })).toBeNull();
  });

  it("keeps a labelled note per facility", async () => {
    let latest: ReportDraft | undefined;
    render(<Harness onChange={(draft) => (latest = draft)} />, { wrapper: WithIntl });
    await userEvent.setup().type(screen.getByRole("textbox", { name: "Catatan untuk Toilet Difabel (opsional)" }), "Kunci di pos satpam");
    expect(latest!.facilities.toilet_difabel.note).toBe("Kunci di pos satpam");
    expect(screen.getByText("19 dari 200 karakter")).toBeTruthy();
  });
});
