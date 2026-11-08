import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WithIntl } from "@/test/intl";
import { ResendCode } from "./resend-code";

const resendCode = vi.hoisted(() => vi.fn(async () => ({})));
vi.mock("@/app/masuk/actions", () => ({ resendCode }));

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  resendCode.mockClear();
});

describe("ResendCode", () => {
  it("stays focusable but inactive while waiting, then announces once that a new code can be requested", () => {
    render(<ResendCode initialWait={2} />, { wrapper: WithIntl });
    const button = screen.getByRole("button", { name: "Kirim ulang kode" });
    expect(button.getAttribute("aria-disabled")).toBe("true");
    expect(button.getAttribute("aria-describedby")).toBe("kirim-ulang-keterangan");
    expect(screen.getByText("Kode baru bisa diminta dalam 2 detik.")).toBeTruthy();
    // Hitung mundur tidak berada di kotak status, jadi tidak dibacakan setiap detik.
    expect(screen.getByRole("status").textContent).toBe("");

    fireEvent.click(button);
    expect(resendCode).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByText("Kode baru bisa diminta dalam 1 detik.")).toBeTruthy();
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(button.hasAttribute("aria-disabled")).toBe(false);
    expect(screen.getByRole("status").textContent).toBe("Kode baru bisa diminta sekarang.");
  });

  it("is ready at once when the last code was sent more than a minute ago", () => {
    render(<ResendCode initialWait={0} />, { wrapper: WithIntl });
    expect(screen.getByRole("button", { name: "Kirim ulang kode" }).hasAttribute("aria-disabled")).toBe(false);
    expect(screen.getByRole("status").textContent).toBe("");
  });
});
