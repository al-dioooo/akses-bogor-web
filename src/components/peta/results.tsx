import { getCandidates, getDistrictPriority, getMapPlaces } from "@/lib/api";
import { exploreHref, hasFilters, type ExploreFilters } from "@/lib/filters";
import { PlaceMap } from "./place-map";
import { toMapCandidates, toMapPlaces } from "./places";
import { SearchBarPlaceholder } from "./search-bar";

/**
 * Isi Peta untuk filter di URL: lokasi, prioritas kecamatan, dan kandidat "Belum ada data" (ADR-0049), digambar oleh peta
 * layar penuh (FR-05). Kandidat tidak punya status dan fasilitas, jadi tidak ikut selama filter itu aktif.
 */
export async function MapResults({ filters }: { filters: ExploreFilters }) {
  const named = { q: filters.q || undefined, category: filters.category, district: filters.district };
  const withCandidates = filters.facility.length === 0 && filters.status.length === 0;
  const [{ features }, priority, candidates] = await Promise.all([
    getMapPlaces({ ...named, facility: filters.facility, status: filters.status }),
    getDistrictPriority(),
    withCandidates ? getCandidates(named) : null,
  ]);
  return (
    <PlaceMap
      places={toMapPlaces(features)}
      listHref={exploreHref(filters)}
      filtered={hasFilters(filters)}
      priority={priority}
      candidates={candidates ? toMapCandidates(candidates.features) : []}
      candidateSource={candidates?.source ?? null}
    />
  );
}

/** Kerangka selama lokasi dimuat: pesan di atas peta dan panel daftar kosong, dengan ukuran yang sama dengan aslinya. */
export function MapResultsSkeleton({ label, search = false }: { label: string; search?: boolean }) {
  return (
    <>
      {search && <SearchBarPlaceholder />}
      <div className="peta-peta">
        <div className="peta-pesan">
          <p role="status" className="panel-raised rounded-full px-5 py-3 font-semibold">
            {label}
          </p>
        </div>
      </div>
      <div aria-hidden="true" className="peta-lembar" />
    </>
  );
}
