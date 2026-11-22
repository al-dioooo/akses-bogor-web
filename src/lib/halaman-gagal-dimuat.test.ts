import { describe, expect, it } from "vitest";
import { failedPlacePage } from "./halaman-gagal-dimuat";

describe("failedPlacePage", () => {
  const html = failedPlacePage("/lokasi/4037ba19");
  document.documentElement.innerHTML = html.replace(/^<!DOCTYPE html>\n<html lang="id">|<\/html>\n$/g, "");

  it("is an Indonesian page that search engines do not index", () => {
    expect(html).toContain('<html lang="id">');
    expect(document.querySelector('meta[name="robots"]')?.getAttribute("content")).toBe("noindex");
    expect(document.title).toBe("Data belum bisa dimuat · AksesBogor");
  });

  it("explains the problem and offers a retry and a way back", () => {
    expect(document.querySelector("h1")?.textContent).toBe("Data belum bisa dimuat");
    const links = [...document.querySelectorAll("a")].map((a) => [a.textContent, a.getAttribute("href")]);
    expect(links).toEqual([
      ["Coba lagi", "/lokasi/4037ba19"],
      ["Kembali ke Jelajahi", "/jelajahi"],
    ]);
  });

  it("escapes the address it links back to", () => {
    expect(failedPlacePage('/lokasi/"><script>')).toContain('href="/lokasi/&quot;&gt;&lt;script&gt;"');
  });
});
