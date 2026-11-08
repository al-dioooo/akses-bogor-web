import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { WithIntl } from "@/test/intl";
import { PickerMap } from "./picker-map";

vi.mock("@/lib/preferences", async (original) => ({ ...(await original<typeof import("@/lib/preferences")>()), hasWebGL: () => false }));

describe("PickerMap", () => {
  it("points to search and device location when the map cannot load", async () => {
    render(<PickerMap candidate={null} onMove={vi.fn()} />, { wrapper: WithIntl });
    expect(await screen.findByText("Peta tidak bisa tampil. Pakai pencarian atau lokasi Anda untuk menentukan titik.")).toBeTruthy();
    expect(screen.queryByRole("group", { name: "Kontrol peta" })).toBeNull();
  });
});
