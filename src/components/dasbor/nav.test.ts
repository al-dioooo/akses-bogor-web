import { describe, expect, it } from "vitest";
import { dashboardGroups, initials, isCurrent } from "./nav";

const keys = (role: "pengguna" | "verifikator" | "admin", agent = true) =>
  dashboardGroups({ role, agent }).map((group) => [group.key, group.items.map((item) => item.key)]);

describe("dashboardGroups", () => {
  it("shows only the contributor section to a regular account", () => {
    expect(keys("pengguna")).toEqual([
      ["utama", ["akun"]],
      ["kontribusi", ["bantu"]],
    ]);
  });

  it("adds the verification desk for verifiers, but not the team page", () => {
    expect(keys("verifikator")).toEqual([
      ["utama", ["akun"]],
      ["kontribusi", ["bantu"]],
      ["verifikasi", ["antrean", "jawaban", "cekUlang"]],
    ]);
  });

  it("adds the team page for admins", () => {
    expect(keys("admin").at(-1)).toEqual(["admin", ["tim"]]);
  });

  it("leaves out Bantu memetakan while the API keeps the agent off", () => {
    expect(keys("pengguna", false)).toEqual([["utama", ["akun"]]]);
  });
});

describe("isCurrent", () => {
  const [main, , desk] = dashboardGroups({ role: "verifikator", agent: true });
  const akun = main!.items[0]!;
  const antrean = desk!.items[0]!;
  const jawaban = desk!.items[1]!;

  it("marks the item for its own page", () => {
    expect(isCurrent(akun, "/akun")).toBe(true);
    expect(isCurrent(jawaban, "/verifikasi/jawaban")).toBe(true);
  });

  it("marks the parent item on its subpages only", () => {
    expect(isCurrent(antrean, "/verifikasi/laporan/abc")).toBe(true);
    expect(isCurrent(antrean, "/verifikasi/jawaban")).toBe(false);
    expect(isCurrent(akun, "/akun/laporan/abc")).toBe(true);
  });

  it("marks nothing before the address is known", () => {
    expect(isCurrent(akun, null)).toBe(false);
  });
});

describe("initials", () => {
  it("takes the first letter of the first two words", () => {
    expect(initials("Sari Lestari Putri")).toBe("SL");
    expect(initials("  budi ")).toBe("B");
  });

  it("falls back to a question mark for an empty name", () => {
    expect(initials("")).toBe("?");
  });
});
