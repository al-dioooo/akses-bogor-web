import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { AgentCard } from "@/lib/agen-rute";
import { WithIntl } from "@/test/intl";
import { AgentCards } from "./agent-cards";

const OSM = { kind: "osm", osmType: "node", osmId: 9001 } as const;
const CARDS: AgentCard[] = [
  {
    type: "prioritas",
    year: 2025,
    districts: [
      { slug: "bogor-tengah", name: "Bogor Tengah", registered: 450, verifiedPlaces: 1, facilitiesWithoutData: 9, score: 18, rank: 2, level: "rendah" },
      { slug: "bogor-barat", name: "Bogor Barat", registered: 1240, verifiedPlaces: 1, facilitiesWithoutData: 38, score: 92, rank: 1, level: "sangat_tinggi" },
    ],
    formula: "Skor naik bila penyandang disabilitas terdaftar banyak.",
    facilitiesSource: { retrievedAt: null, attribution: "© kontributor OpenStreetMap" },
    caveat: "Angka ini jumlah penyandang disabilitas yang terdaftar di Dinas Sosial, bukan jumlah seluruh penduduk; lonjakan antartahun besar.",
    source: { title: "Jumlah Penyandang Disabilitas", url: "https://opendata.kotabogor.go.id/", publisher: "Open Data Kota Bogor, Dinas Sosial", retrievedAt: "2026-11-22T00:00:00.000Z", terms: "Data terbuka." },
  },
  { type: "tempat", target: OSM, name: null, category: "masjid", district: { slug: "bogor-barat", name: "Bogor Barat" }, location: { lat: -6.5712, lng: 106.7655 }, osmUrl: "https://www.openstreetmap.org/node/9001", attribution: "© kontributor OpenStreetMap" },
  { type: "tempat", target: { kind: "aksesbogor", placeId: "p1" }, name: "Halte contoh", category: "halte", district: { slug: "bogor-tengah", name: "Bogor Tengah" }, status: "sebagian", lastVerifiedAt: "2026-10-18T03:00:00.000Z" },
  { type: "rute", target: OSM, name: null },
];

describe("AgentCards", () => {
  it("ranks the districts with the level as text, the caveat and the source credit", () => {
    render(<AgentCards cards={CARDS} />, { wrapper: WithIntl });
    const table = screen.getByRole("table");
    const rows = within(table).getAllByRole("row").slice(1);
    expect(rows.map((row) => within(row).getByRole("rowheader").textContent)).toEqual(["Bogor Barat", "Bogor Tengah"]);
    expect(rows[0]!.textContent).toContain("Sangat tinggi");
    expect(screen.getByText(/bukan jumlah seluruh penduduk/)).toBeTruthy();
    expect(screen.getByRole("link", { name: "Jumlah Penyandang Disabilitas" }).getAttribute("href")).toBe("https://opendata.kotabogor.go.id/");
    expect(screen.getByText(/Open Data Kota Bogor, Dinas Sosial/)).toBeTruthy();
    expect(screen.getByText("Cara menghitung skor: Skor naik bila penyandang disabilitas terdaftar banyak.")).toBeTruthy();
    expect(screen.getByText("Jumlah fasilitas tanpa data dihitung dari data OpenStreetMap, © kontributor OpenStreetMap.")).toBeTruthy();
    expect(document.body.textContent).not.toMatch(/cacat/i);
  });

  it("shows OSM facilities without data and AksesBogor places with their status", () => {
    render(<AgentCards cards={CARDS} />, { wrapper: WithIntl });
    const osm = screen.getByRole("article", { name: "Tanpa nama di OpenStreetMap" });
    expect(within(osm).getByText("Belum ada data AksesBogor")).toBeTruthy();
    expect(within(osm).getByRole("link", { name: "Lihat di OpenStreetMap" }).getAttribute("href")).toBe("https://www.openstreetmap.org/node/9001");
    expect(within(osm).getByRole("link", { name: "Laporkan tempat ini" }).getAttribute("href")).toBe("/laporkan");
    const place = screen.getByRole("article", { name: "Halte contoh" });
    expect(within(place).getByText("Sebagian")).toBeTruthy();
    expect(within(place).getByRole("link", { name: "Lihat detail lokasi" }).getAttribute("href")).toBe("/lokasi/p1");
  });

  it("adds a route card that asks for the start point itself", () => {
    render(<AgentCards cards={CARDS} />, { wrapper: WithIntl });
    const route = screen.getByRole("region", { name: "Rute jalan kaki ke fasilitas ini" });
    expect(within(route).getByRole("button", { name: "Pakai lokasi saya" })).toBeTruthy();
  });
});
