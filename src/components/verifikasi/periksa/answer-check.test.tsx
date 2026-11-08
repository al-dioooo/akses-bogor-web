import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { WithIntl } from "@/test/intl";
import { AnswerCheck } from "./answer-check";
import type { FacilityDecision } from "./decision";

function Harness({ initial }: { initial: FacilityDecision }) {
  const [value, setValue] = useState(initial);
  return <AnswerCheck facility="lift" value={value} onChange={setValue} />;
}

describe("AnswerCheck", () => {
  it("labels every control with the facility name and works with the keyboard", async () => {
    const user = userEvent.setup();
    render(<Harness initial={{ answer: "tersedia", reason: null, note: "", evidence: null }} />, { wrapper: WithIntl });
    const evidence = screen.getByRole("group", { name: "Bukti untuk Lift / Elevator" });
    expect(evidence).toBeTruthy();
    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole("radio", { name: /^Terbukti/ }));
    await user.keyboard(" ");
    expect(screen.getByRole("group", { name: "Jawaban yang tayang untuk Lift / Elevator" })).toBeTruthy();
    expect(screen.getByText("Akan tayang:")).toBeTruthy();

    await user.click(screen.getByRole("radio", { name: "Tidak tersedia" }));
    await user.click(screen.getByRole("radio", { name: "Rusak" }));
    expect(screen.getByRole("group", { name: "Alasan tidak tersedia untuk Lift / Elevator" })).toBeTruthy();
    expect(screen.getByLabelText("Catatan yang tayang untuk Lift / Elevator")).toBeTruthy();
  });

  it("shows Belum diketahui as the published answer when there is no evidence", async () => {
    const user = userEvent.setup();
    render(<Harness initial={{ answer: "tersedia", reason: null, note: "", evidence: null }} />, { wrapper: WithIntl });
    await user.click(screen.getByRole("radio", { name: /^Tanpa bukti/ }));
    expect(screen.queryByRole("group", { name: /Jawaban yang tayang/ })).toBeNull();
    expect(screen.getByText("Akan tayang:").parentElement!.textContent).toContain("Belum diketahui");
  });
});
