import { getFormatter, getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { getStats } from "@/lib/api";
import { LoadErrorBoundary } from "@/ui/load-error";

/** Pita jalan di bawah hero: jalan di ilustrasi berlanjut menjadi tempat angka dari API (FR-01). */
export async function RoadStats() {
  const t = await getTranslations("Beranda.stats");
  return (
    <section aria-labelledby="judul-angka" className="road-band bg-bg-road text-text-on-inverse">
      <h2 id="judul-angka" className="sr-only">
        {t("label")}
      </h2>
      <div className="page-width relative">
        <LoadErrorBoundary>
          <Suspense fallback={<StatsSkeleton label={t("loading")} />}>
            <Stats />
          </Suspense>
        </LoadErrorBoundary>
      </div>
    </section>
  );
}

async function Stats() {
  const [t, format, stats] = await Promise.all([getTranslations("Beranda.stats"), getFormatter(), getStats()]);
  const items = [
    { value: format.number(stats.places), label: t("places") },
    { value: t("stepFreeValue", { count: stats.stepFreeEntrance, total: stats.places }), label: t("stepFree"), highlight: true },
    { value: format.number(stats.contributors), label: t("contributors") },
  ];
  return (
    <dl className="grid lg:grid-cols-3">
      {items.map((item, index) => (
        <div
          key={item.label}
          className={`flex flex-col-reverse gap-2.5 border-b-4 border-dashed border-text-on-inverse/25 py-7 last:border-0 lg:border-0 ${index === 1 ? "lg:pt-18 lg:pb-9" : "lg:pt-9 lg:pb-18"}`}
        >
          <dt className="text-text-on-inverse-secondary">{item.label}</dt>
          <dd className={`display text-[clamp(3rem,2rem+3vw,5rem)] leading-[0.9] tabular-nums ${item.highlight ? "text-text-highlight" : ""}`}>
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function StatsSkeleton({ label }: { label: string }) {
  return (
    <div role="status" className="grid gap-6 py-9 lg:grid-cols-3">
      <span className="sr-only">{label}</span>
      {[0, 1, 2].map((key) => (
        <div key={key} aria-hidden="true" className="flex flex-col gap-3">
          <span className="h-14 w-32 rounded-lg bg-text-on-inverse/10" />
          <span className="h-4 w-44 rounded-sm bg-text-on-inverse/10" />
        </div>
      ))}
    </div>
  );
}
