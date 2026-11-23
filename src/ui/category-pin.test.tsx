import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CATEGORIES } from "@/lib/api";
import { CATEGORY_ICON, STATUS_ICON } from "./place-icons";
import { CategoryPin } from "./category-pin";
import { PlacePin } from "./place-pin";

// Vitest berjalan dari akar repo.
type Variable = { name: string; values: Record<string, { color?: string; alias?: string }> };
const tokens = JSON.parse(readFileSync(join(process.cwd(), "design-tokens/figma-variables.json"), "utf8")) as {
  collections: { name: string; variables: Variable[] }[];
};
const variables = new Map(tokens.collections.flatMap((c) => c.variables).map((v) => [v.name, v]));

function resolve(name: string, mode: string): string {
  const value = variables.get(name)!.values[mode] ?? variables.get(name)!.values.Value;
  return value.alias ? resolve(value.alias, "Value") : value.color!;
}

function luminance(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string) {
  const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (high + 0.05) / (low + 0.05);
}

// Warna terbanyak di peta dasar Mapbox light-v11 dan dark-v11 di Kota Bogor (daratan, jalan, air), diambil dari
// tangkapan layar Peta pada zoom 11 dan 14.
const BASEMAP = {
  Terang: ["#F6F6F6", "#FEFEFE", "#FAFAFA", "#EEEEEE", "#EAEAEE", "#DADADE"],
  Gelap: ["#2A2A2A", "#1E222A", "#262626", "#323232", "#3E3E3E", "#12121A"],
};
const TOKEN = { kampus: "kampus", masjid: "masjid", halte: "halte", rumah_sakit: "rumah-sakit" } as const;

describe("category colours", () => {
  for (const mode of ["Terang", "Gelap"] as const) {
    it(`stand out at 3:1 or more against the ${mode === "Terang" ? "light" : "dark"} basemap`, () => {
      for (const category of CATEGORIES) {
        const color = resolve(`color/category/${TOKEN[category]}`, mode);
        for (const ground of BASEMAP[mode]) expect(contrast(color, ground), `${category} ${color} on ${ground}`).toBeGreaterThanOrEqual(3);
      }
    });

    it(`keep the icon on the badge at 4.5:1 or more in ${mode === "Terang" ? "light" : "dark"} mode`, () => {
      const on = resolve("color/category/on", mode);
      for (const category of CATEGORIES) expect(contrast(resolve(`color/category/${TOKEN[category]}`, mode), on)).toBeGreaterThanOrEqual(4.5);
    });
  }
});

const paths = (element: Element) => [...element.querySelectorAll("path")].map((path) => path.getAttribute("d"));

describe("CategoryPin", () => {
  it("pairs the category colour with the category icon", () => {
    const { container } = render(<CategoryPin category="masjid" />);
    const pin = container.firstElementChild!;
    expect(pin.className).toContain("bg-category-masjid");
    expect(paths(pin)).toEqual([...CATEGORY_ICON.masjid]);
    expect(pin.getAttribute("aria-hidden")).toBe("true");
  });
});

describe("PlacePin", () => {
  it("keeps the status colour and icon, and adds the category badge", () => {
    const { container } = render(<PlacePin place={{ status: "tidak_aksesibel", category: "halte" }} />);
    const [status, badge] = [...container.firstElementChild!.children];
    expect(status.className).toContain("bg-status-inaccessible-solid");
    expect(paths(status)).toEqual([...STATUS_ICON.tidak_aksesibel]);
    expect(badge.className).toContain("bg-category-halte");
    expect(paths(badge)).toEqual([...CATEGORY_ICON.halte]);
  });
});
