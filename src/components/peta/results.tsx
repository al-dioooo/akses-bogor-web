import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { getMapPlaces } from "@/lib/api";
import { exploreHref, hasFilters, type ExploreFilters } from "@/lib/filters";
import { buttonClass } from "@/ui/button-styles";
import { Icon } from "@/ui/icon";
import { IconList } from "@/ui/icons";
import { MapLegend } from "./legend";
import { PlaceMap } from "./place-map";
import { toMapPlaces } from "./places";

/** Isi Peta untuk filter di URL: jumlah, tombol ke daftar dengan filter yang sama (FR-05), peta, legenda, dan daftar lokasi. */
export async function MapResults({ filters }: { filters: ExploreFilters }) {
  const [t, tj] = await Promise.all([getTranslations("Peta"), getTranslations("Jelajahi")]);
  const { features } = await getMapPlaces({
    q: filters.q || undefined,
    category: filters.category,
    district: filters.district,
    facility: filters.facility,
    status: filters.status,
  });
  const places = toMapPlaces(features);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Diumumkan pembaca layar setiap kali filter diterapkan. */}
        <p role="status" className="font-mono text-sm font-medium text-text-secondary">
          {t("count", { total: places.length })}
        </p>
        <Link href={exploreHref(filters)} className={buttonClass("outline", "sm")}>
          <Icon icon={IconList} />
          {t("asList")}
        </Link>
      </div>
      {places.length === 0 && hasFilters(filters) && (
        <div className="flex flex-col items-start gap-3 rounded-3xl bg-bg-sunken p-6">
          <p className="font-heading text-xl font-bold">{tj("results.emptyTitle")}</p>
          <p className="text-text-secondary">{tj("results.emptyBody")}</p>
          <Link href="/peta" className={buttonClass("outline", "sm")}>
            {tj("filters.reset")}
          </Link>
        </div>
      )}
      <PlaceMap places={places} listHref={exploreHref(filters)} legend={<MapLegend />} />
    </>
  );
}

export function MapResultsSkeleton({ label }: { label: string }) {
  return (
    <div role="status" className="flex flex-col gap-5">
      <span className="sr-only">{label}</span>
      <span aria-hidden="true" className="h-6 w-48 rounded-sm bg-surface-brand-subtle" />
      <div aria-hidden="true" className="panel h-[clamp(20rem,60svh,40rem)] rounded-3xl" />
    </div>
  );
}
