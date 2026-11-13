import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { WithIntl } from "@/test/intl";
import { ShareButton } from "./share-button";

const ID = "b3e865a0-3b4a-4ab0-a42e-65fea37bd33e";
const URL_OF_PLACE = `${window.location.origin}/lokasi/${ID}`;

function setClipboard(writeText: (text: string) => Promise<void>) {
  Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
}

afterEach(() => {
  Reflect.deleteProperty(navigator, "clipboard");
  Reflect.deleteProperty(navigator, "share");
});

describe("ShareButton", () => {
  it("copies the place link without extra parameters and announces it in the status box", async () => {
    const writeText = vi.fn(async () => {});
    setClipboard(writeText);
    render(<ShareButton id={ID} title="Kampus contoh B" />, { wrapper: WithIntl });
    expect(screen.getByRole("status").textContent).toBe("");

    fireEvent.click(screen.getByRole("button", { name: "Bagikan" }));
    await waitFor(() => expect(screen.getByRole("status").textContent).toBe("Tautan lokasi ini sudah disalin."));
    expect(writeText).toHaveBeenCalledWith(URL_OF_PLACE);
  });

  it("uses the device share sheet when there is one and shows no message", async () => {
    const share = vi.fn(async () => {});
    Object.defineProperty(navigator, "share", { value: share, configurable: true });
    const writeText = vi.fn(async () => {});
    setClipboard(writeText);
    render(<ShareButton id={ID} title="Kampus contoh B" />, { wrapper: WithIntl });

    fireEvent.click(screen.getByRole("button", { name: "Bagikan" }));
    await waitFor(() => expect(share).toHaveBeenCalledWith({ title: "Kampus contoh B", url: URL_OF_PLACE }));
    expect(writeText).not.toHaveBeenCalled();
    expect(screen.getByRole("status").textContent).toBe("");
  });

  it("shows the link in a selected field when copying fails", async () => {
    setClipboard(async () => {
      throw new Error("Denied");
    });
    render(<ShareButton id={ID} title="Kampus contoh B" />, { wrapper: WithIntl });

    fireEvent.click(screen.getByRole("button", { name: "Bagikan" }));
    const field = await screen.findByRole("textbox", { name: "Alamat halaman lokasi" });
    expect(screen.getByRole("status").textContent).toBe("Tautan tidak bisa disalin otomatis. Salin alamat di bawah ini.");
    expect((field as HTMLInputElement).value).toBe(URL_OF_PLACE);
    expect(field.getAttribute("aria-describedby")).toBe(screen.getByRole("status").querySelector("p")?.id);
    await waitFor(() => expect(document.activeElement).toBe(field));
  });
});
