import { describe, expect, it } from "vitest";
import { listHref, parseListQuery } from "./query";

describe("parseListQuery", () => {
  it("reads the filters and the page, and turns them into an API query", () => {
    const { filters, page, query, active } = parseListQuery({ q: " masjid ", kategori: "masjid", asal: "admin", tayang: "tidak", halaman: "3" });
    expect(filters).toEqual({ q: "masjid", category: "masjid", district: undefined, status: undefined, origin: "admin", published: "tidak" });
    expect(page).toBe(3);
    expect(query).toMatchObject({ limit: 25, offset: 50 });
    expect(active).toBe(true);
  });

  it("ignores unknown values and a broken page number", () => {
    const { filters, page, active } = parseListQuery({ kategori: "mal", status: "x", asal: "warga", halaman: "-2" });
    expect(filters.category).toBeUndefined();
    expect(filters.status).toBeUndefined();
    expect(filters.origin).toBeUndefined();
    expect(page).toBe(1);
    expect(active).toBe(false);
  });
});

describe("listHref", () => {
  it("keeps the filters and adds the page only after the first", () => {
    expect(listHref({ category: "halte", published: "ya" }, 2)).toBe("/verifikasi/tempat?kategori=halte&tayang=ya&halaman=2");
    expect(listHref({}, 1)).toBe("/verifikasi/tempat");
  });
});
