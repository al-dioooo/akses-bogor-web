import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { newDraft, type ReportDraft } from "@/lib/isian-laporan";
import { WithIntl } from "@/test/intl";
import { StepPhotos } from "./step-photos";

// jsdom tidak bisa membaca gambar; memperkecil foto diuji di browser lewat Playwright.
vi.mock("@/lib/foto", async (original) => {
  const actual = await original<typeof import("@/lib/foto")>();
  return {
    ...actual,
    shrinkPhoto: vi.fn(async (file: File) => {
      const problem = actual.checkFile(file);
      if (problem) throw new actual.PhotoError(problem);
      return { blob: new Blob(["jpeg"], { type: "image/jpeg" }), width: 2048, height: 1536 };
    }),
  };
});
vi.stubGlobal("URL", Object.assign(URL, { createObjectURL: () => "blob:tiruan", revokeObjectURL: () => undefined }));

function Harness({ start }: { start?: Partial<ReportDraft> }) {
  const [draft, setDraft] = useState({ ...newDraft("baru", null), ...start });
  return <StepPhotos draft={draft} errors={[]} update={(change) => setDraft((current) => ({ ...current, ...change }))} />;
}

const jpeg = (name: string) => new File(["x"], name, { type: "image/jpeg" });

describe("StepPhotos", () => {
  it("adds photos with a tag list and a caption each, and reports files it cannot use", async () => {
    render(<Harness />, { wrapper: WithIntl });
    const user = userEvent.setup({ applyAccept: false });
    await user.upload(screen.getByLabelText("Pilih foto"), [jpeg("pintu.jpg"), jpeg("lift.jpg"), new File(["GIF"], "animasi.gif", { type: "image/gif" })]);
    expect(await screen.findByText("2 foto ditambahkan. Pilih objek di setiap foto.")).toBeTruthy();
    expect(screen.getByText("2 dari 10 foto")).toBeTruthy();
    expect(within(screen.getByRole("alert")).getByText("animasi.gif: format tidak didukung. Pilih JPEG, PNG, atau WebP.")).toBeTruthy();
    const tag = screen.getByRole("combobox", { name: "Objek di foto 1" });
    expect(within(tag).getAllByRole("option").map((o) => o.textContent)).toEqual(["Pilih objek", "Pintu masuk dan ramp", "Toilet difabel", "Guiding block", "Lift", "Lainnya"]);
    await user.selectOptions(tag, "pintu_masuk");
    expect(screen.getByRole("img", { name: "Pratinjau foto 1, pintu.jpg" })).toBeTruthy();
    expect(screen.getByRole("textbox", { name: "Keterangan foto 2 (opsional)" })).toBeTruthy();
    const suggested = screen.getByRole("heading", { name: "Foto yang membantu verifikasi" }).nextElementSibling!;
    expect(suggested.textContent).toBe("Pintu masuk dan ramp (sudah ada)");
  });

  it("moves focus to the next photo after removing one", async () => {
    render(<Harness />, { wrapper: WithIntl });
    const user = userEvent.setup();
    await user.upload(screen.getByLabelText("Pilih foto"), [jpeg("a.jpg"), jpeg("b.jpg")]);
    await screen.findByText("2 dari 10 foto");
    await user.click(screen.getByRole("button", { name: "Lepas foto 1" }));
    expect(screen.getByText("Foto 1 dilepas.")).toBeTruthy();
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("combobox", { name: "Objek di foto 1" })));
    expect(screen.getByRole("img", { name: "Pratinjau foto 1, b.jpg" })).toBeTruthy();
  });

  it("stops at 10 photos", async () => {
    const photos = Array.from({ length: 9 }, (_, i) => ({ key: `f${i}`, blob: new Blob(["x"]), name: `${i}.jpg`, width: 10, height: 10, tag: "lainnya" as const, caption: "", uploadedId: null }));
    render(<Harness start={{ photos }} />, { wrapper: WithIntl });
    const user = userEvent.setup();
    await user.upload(screen.getByLabelText("Pilih foto"), [jpeg("kesepuluh.jpg"), jpeg("kesebelas.jpg")]);
    expect(await screen.findByText("10 dari 10 foto")).toBeTruthy();
    expect(screen.getByText("kesebelas.jpg: tidak ditambahkan karena sudah 10 foto.")).toBeTruthy();
    expect(screen.getByText("Sudah 10 foto. Lepas foto lain dulu untuk menambah.")).toBeTruthy();
    expect(screen.getByLabelText("Pilih foto")).toHaveProperty("disabled", true);
  });
});
