import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { FilterForm } from "@/components/jelajahi/filter-form";
import { Results, ResultsSkeleton } from "@/components/jelajahi/results";
import { exploreHref, parseFilters } from "@/lib/filters";
import { SectionHeading } from "@/ui/section-heading";
import { LoadErrorBoundary } from "@/ui/load-error";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Jelajahi");
  return { title: t("metaTitle") };
}

/** Jelajahi (ADR-0027): judul tampil langsung, filter dan hasil dibaca dari URL saat request. */
export default async function Jelajahi({ searchParams }: PageProps<"/jelajahi">) {
  const t = await getTranslations("Jelajahi");
  return (
    <main id="konten" className="page-width flex flex-1 flex-col gap-8 pt-8 sm:pt-12">
      <SectionHeading id="judul-jelajahi" level={1} label={t("eyebrow")} title={t("title")} accent={t("accent")} intro={t("intro")} />
      <Suspense fallback={<ResultsSkeleton label={t("results.loading")} />}>
        <Explore searchParams={searchParams} loading={t("results.loading")} />
      </Suspense>
    </main>
  );
}

async function Explore({ searchParams, loading }: { searchParams: PageProps<"/jelajahi">["searchParams"]; loading: string }) {
  const filters = parseFilters(await searchParams);
  return (
    <>
      <FilterForm filters={filters} />
      <LoadErrorBoundary>
        <Suspense key={exploreHref(filters, filters.page)} fallback={<ResultsSkeleton label={loading} />}>
          <Results filters={filters} />
        </Suspense>
      </LoadErrorBoundary>
    </>
  );
}
