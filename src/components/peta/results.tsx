import { getDistrictPriority, getMapPlaces } from "@/lib/api";
import { exploreHref, hasFilters, type ExploreFilters } from "@/lib/filters";
import { PlaceMap } from "./place-map";
import { toMapPlaces } from "./places";

/** Isi Peta untuk filter di URL: lokasi dan prioritas kecamatan, digambar oleh peta layar penuh (FR-05). */
export async function MapResults({ filters }: { filters: ExploreFilters }) {
  const [{ features }, priority] = await Promise.all([
    getMapPlaces({
      q: filters.q || undefined,
      category: filters.category,
      district: filters.district,
      facility: filters.facility,
      status: filters.status,
    }),
    getDistrictPriority(),
  ]);
  return <PlaceMap places={toMapPlaces(features)} listHref={exploreHref(filters)} filtered={hasFilters(filters)} priority={priority} />;
}

/** Kerangka selama lokasi dimuat: pesan di atas peta dan panel daftar kosong, dengan ukuran yang sama dengan aslinya. */
export function MapResultsSkeleton({ label, search = false }: { label: string; search?: boolean }) {
  return (
    <>
      {search && <div aria-hidden="true" className="peta-cari h-26 md:h-36" />}
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
