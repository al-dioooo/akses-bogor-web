import { CATEGORIES, STATUSES } from "@/lib/api";
import type { AdminPlaceQuery } from "@/lib/kelola-tempat";

// Saringan daftar Kelola tempat dari URL (ADR-0051). Nilai yang tidak dikenal diabaikan, jadi alamat yang diubah tangan
// tetap membuka daftar.

export const PAGE_SIZE = 25;

type Params = Record<string, string | string[] | undefined>;

const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value)?.trim() || undefined;
const pick = <T extends string>(value: string | undefined, allowed: readonly T[]) => (allowed as readonly string[]).includes(value ?? "") ? (value as T) : undefined;

export type ListFilters = Pick<AdminPlaceQuery, "q" | "category" | "district" | "status" | "origin" | "published">;

/** Saringan, halaman (mulai 1), dan isi permintaan API. */
export function parseListQuery(params: Params) {
  const filters: ListFilters = {
    q: one(params.q)?.slice(0, 80),
    category: pick(one(params.kategori), CATEGORIES),
    district: one(params.kecamatan)?.slice(0, 40),
    status: pick(one(params.status), STATUSES),
    origin: pick(one(params.asal), ["tim", "admin", "street_view"] as const),
    published: pick(one(params.tayang), ["ya", "tidak"] as const),
  };
  const page = Math.max(1, Math.floor(Number(one(params.halaman)) || 1));
  const query: AdminPlaceQuery = { ...filters, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE };
  const active = Object.values(filters).some((value) => value !== undefined);
  return { filters, page, query, active };
}

/** Alamat daftar dengan saringan yang sama dan halaman lain. Nama parameter memakai bahasa Indonesia seperti Jelajahi. */
export function listHref(filters: ListFilters, page = 1) {
  const params = new URLSearchParams();
  const entries: [string, string | undefined][] = [
    ["q", filters.q],
    ["kategori", filters.category],
    ["kecamatan", filters.district],
    ["status", filters.status],
    ["asal", filters.origin],
    ["tayang", filters.published],
  ];
  for (const [key, value] of entries) if (value) params.set(key, value);
  if (page > 1) params.set("halaman", String(page));
  const text = params.toString();
  return text ? `/verifikasi/tempat?${text}` : "/verifikasi/tempat";
}
