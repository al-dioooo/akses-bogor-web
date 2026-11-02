import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { FilterForm } from "@/components/jelajahi/filter-form";
import { MapResults, MapResultsSkeleton } from "@/components/peta/results";
import { mapHref, parseFilters } from "@/lib/filters";
import { LoadErrorBoundary } from "@/ui/load-error";
import { SectionHeading } from "@/ui/section-heading";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Peta");
  return { title: t("metaTitle") };
}

/** Peta (FR-05): filter sama dengan Jelajahi dan dibaca dari URL saat request. */
export default async function Peta({ searchParams }: PageProps<"/peta">) {
  const t = await getTranslations("Peta");
  return (
    <main id="konten" className="page-width flex flex-1 flex-col gap-6 pt-8 sm:pt-12">
      <SectionHeading id="judul-peta" level={1} label={t("eyebrow")} title={t("title")} accent={t("accent")} />
      <Suspense fallback={<MapResultsSkeleton label={t("loading")} />}>
        <MapContent searchParams={searchParams} loading={t("loading")} />
      </Suspense>
    </main>
  );
}

async function MapContent({ searchParams, loading }: { searchParams: PageProps<"/peta">["searchParams"]; loading: string }) {
  const filters = parseFilters(await searchParams);
  return (
    <>
      <FilterForm filters={filters} action="/peta" />
      <LoadErrorBoundary>
        <Suspense key={mapHref(filters)} fallback={<MapResultsSkeleton label={loading} />}>
          <MapResults filters={filters} />
        </Suspense>
      </LoadErrorBoundary>
    </>
  );
}
