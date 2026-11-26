import { describe, expect, it } from "vitest";
import { dashboardGroups, initials, isCurrent } from "./nav";

const keys = (role: "pengguna" | "verifikator" | "admin", agent = true) =>
  dashboardGroups({ role, agent }).map((group) => [group.key, group.items.map((item) => item.key)]);

describe("dashboardGroups", () => {
  it("shows only the contributor section to a regular account", () => {
    expect(keys("pengguna")).toEqual([
      ["utama", ["ringkasan"]],
      ["kontribusi", ["laporan", "agen"]],
      ["akun", ["pengaturan"]],
    ]);
  });

  it("adds the verification desk for verifiers, but not the team page", () => {
    expect(keys("verifikator")).toEqual([
      ["utama", ["ringkasan"]],
      ["kontribusi", ["laporan", "agen"]],
      ["verifikasi", ["antrean", "jawaban", "cekUlang"]],
      ["akun", ["pengaturan"]],
    ]);
  });

  it("adds the team page for admins", () => {
    expect(keys("admin").at(-2)).toEqual(["admin", ["tempat", "tim"]]);
  });

  it("leaves out Agen AI while the API keeps the contributor agent off", () => {
    expect(keys("pengguna", false)[1]).toEqual(["kontribusi", ["laporan"]]);
  });
});

describe("isCurrent", () => {
  const [main, contribution, desk, account] = dashboardGroups({ role: "verifikator", agent: true });
  const home = main!.items[0]!;
  const reports = contribution!.items[0]!;
  const settings = account!.items[0]!;
  const antrean = desk!.items[0]!;
  const jawaban = desk!.items[1]!;

  it("marks the item for its own page", () => {
    expect(isCurrent(home, "/akun")).toBe(true);
    expect(isCurrent(reports, "/akun/laporan")).toBe(true);
    expect(isCurrent(jawaban, "/verifikasi/jawaban")).toBe(true);
  });

  it("marks the parent item on its subpages only", () => {
    expect(isCurrent(antrean, "/verifikasi/laporan/abc")).toBe(true);
    expect(isCurrent(antrean, "/verifikasi/jawaban")).toBe(false);
    expect(isCurrent(reports, "/akun/laporan/abc")).toBe(true);
    expect(isCurrent(settings, "/akun/hapus")).toBe(true);
    expect(isCurrent(home, "/akun/laporan")).toBe(false);
  });

  it("marks nothing before the address is known", () => {
    expect(isCurrent(home, null)).toBe(false);
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
