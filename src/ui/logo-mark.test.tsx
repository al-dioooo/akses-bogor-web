import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import mark from "./logo-mark.json";
import { LogoMark } from "./logo-mark";

// Vitest berjalan dari akar repo.
const iconSvg = readFileSync(join(process.cwd(), "src/app/icon.svg"), "utf8");

describe("LogoMark", () => {
  it("draws the same pin, door and leaf as the favicon", () => {
    const { container } = render(<LogoMark />);
    const paths = [...container.querySelectorAll("path")].map((path) => path.getAttribute("d"));
    expect(paths).toEqual([mark.pin, mark.door, mark.leaf]);
    for (const d of paths) expect(iconSvg).toContain(`d="${d}"`);
  });

  it("is decorative, so the wordmark next to it names the link", () => {
    const { container } = render(<LogoMark />);
    expect(container.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
  });
});

describe("icon.svg", () => {
  it("uses the brand colours from the tokens", () => {
    expect(iconSvg).toContain('fill="#6440E8"');
    expect(iconSvg).toContain('fill="#FFFFFF"');
    expect(iconSvg).toContain('fill="#F2C230"');
  });
});
