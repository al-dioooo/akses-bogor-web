import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { WithIntl } from "@/test/intl";
import { CodeForm } from "./code-form";

vi.mock("@/app/masuk/actions", () => ({ checkCode: vi.fn() }));

describe("CodeForm", () => {
  it("is one labelled field that accepts autofill and pasted codes", () => {
    render(<CodeForm kembali="/laporkan" />, { wrapper: WithIntl });
    const field = screen.getByLabelText("Kode 6 digit");
    expect(field).toHaveProperty("type", "text");
    expect(field.getAttribute("autocomplete")).toBe("one-time-code");
    expect(field.getAttribute("inputmode")).toBe("numeric");
    expect(field.hasAttribute("maxlength")).toBe(false);
    expect(field.hasAttribute("pattern")).toBe(false);
    expect(field.getAttribute("aria-describedby")).toBe("kode-petunjuk");
    expect(screen.getAllByRole("textbox")).toHaveLength(1);
    expect(document.querySelector('input[name="kembali"]')).toHaveProperty("value", "/laporkan");
  });
});
