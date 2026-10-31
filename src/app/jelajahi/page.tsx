import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { FilterForm } from "@/components/jelajahi/filter-form";
import { Results, ResultsSkeleton } from "@/components/jelajahi/results";
import { exploreHref, parseFilters } from "@/lib/filters";
import { LoadErrorBoundary } from "@/ui/load-error";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Jelajahi");
  return { title: t("metaTitle") };
}

/** Jelajahi (Explore · DS v1): judul tampil langsung, filter dan hasil dibaca dari URL saat request. */
export default async function Jelajahi({ searchParams }: PageProps<"/jelajahi">) {
  const t = await getTranslations("Jelajahi");
  return (
    <main id="konten" className="page-width flex flex-1 flex-col gap-8 pt-10 sm:pt-14">
      <div className="flex max-w-2xl flex-col items-start gap-3">
        <span className="lbl">{t("eyebrow")}</span>
        <h1 className="font-heading text-[clamp(2rem,1.5rem+2vw,3rem)] leading-[1.08] font-extrabold tracking-[-0.035em]">
          {t("title")}
        </h1>
        <p className="text-lg text-text-secondary">{t("intro")}</p>
      </div>
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
