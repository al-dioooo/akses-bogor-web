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
  // Setiap angka dan labelnya di tengah kolom dan di tengah tinggi pita (issue #196). Mulai 1024 px marka jalan
  // (globals.css) lewat di tengah pita, di belakang angka: setiap blok angka berlatar aspal, jadi marka terputus di sana.
  return (
    <dl className="grid text-center lg:grid-cols-3 lg:py-12">
      {items.map((item) => (
        <div
          key={item.label}
          className="flex flex-col-reverse items-center gap-2.5 border-b-4 border-dashed border-text-on-inverse/25 py-7 last:border-0 lg:relative lg:justify-self-center lg:border-0 lg:bg-bg-road lg:px-6 lg:py-3"
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
        <div key={key} aria-hidden="true" className="flex flex-col items-center gap-3">
          <span className="h-14 w-32 rounded-lg bg-text-on-inverse/10" />
          <span className="h-4 w-44 rounded-sm bg-text-on-inverse/10" />
        </div>
      ))}
    </div>
  );
}
