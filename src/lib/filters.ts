import { CATEGORIES, FACILITIES, STATUSES, type Category, type Facility, type Status } from "./api";

export const PAGE_SIZE = 12;

export type ExploreFilters = {
  q: string;
  category: Category[];
  district: string[];
  facility: Facility[];
  status: Status[];
  page: number;
};

type SearchParams = Record<string, string | string[] | undefined>;

// Formulir GET mengirim nilai berulang (category=a&category=b); tautan lama boleh memakai koma (category=a,b).
function values(params: SearchParams, key: string) {
  return [params[key] ?? []]
    .flat()
    .flatMap((value) => value.split(","))
    .map((value) => value.trim())
    .filter(Boolean);
}

const oneOf = <T extends string>(allowed: readonly T[], list: string[]) =>
  [...new Set(list)].filter((value): value is T => allowed.includes(value as T));

/** Filter Jelajahi dari URL. Nilai yang tidak dikenal diabaikan, bukan dianggap galat. */
export function parseFilters(params: SearchParams): ExploreFilters {
  const page = Number.parseInt(values(params, "halaman")[0] ?? "1", 10);
  return {
    q: (values(params, "q")[0] ?? "").slice(0, 80),
    category: oneOf(CATEGORIES, values(params, "category")),
    district: [...new Set(values(params, "district"))].filter((slug) => /^[a-z-]+$/.test(slug)),
    facility: oneOf(FACILITIES, values(params, "facility")),
    status: oneOf(STATUSES, values(params, "status")),
    page: Number.isFinite(page) && page > 0 ? page : 1,
  };
}

/** Alamat Jelajahi untuk filter yang sama, mis. untuk halaman berikutnya. */
export function exploreHref(filters: ExploreFilters, page = 1) {
  const query = new URLSearchParams();
  if (filters.q) query.set("q", filters.q);
  for (const key of ["category", "district", "facility", "status"] as const) {
    for (const value of filters[key]) query.append(key, value);
  }
  if (page > 1) query.set("halaman", String(page));
  const search = query.toString();
  return search ? `/jelajahi?${search}` : "/jelajahi";
}

/** Jumlah filter di panel Filter (kecamatan, fasilitas, status), untuk label tombolnya. */
export const panelFilterCount = (filters: ExploreFilters) =>
  filters.district.length + filters.facility.length + filters.status.length;

export const hasFilters = (filters: ExploreFilters) => Boolean(filters.q) || filters.category.length > 0 || panelFilterCount(filters) > 0;
