import Form from "next/form";
import { getFormatter, getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { getStats } from "@/lib/api";
import { buttonClass } from "@/ui/button-styles";
import { Icon } from "@/ui/icon";
import { IconSearch } from "@/ui/icons";
import { LoadErrorBoundary } from "@/ui/load-error";

export async function Hero() {
  const t = await getTranslations("Beranda");
  return (
    <section aria-labelledby="judul-beranda" className="page-width flex flex-col items-center pt-12 text-center sm:pt-20">
      <span className="eyebrow glass">{t("eyebrow")}</span>
      <h1
        id="judul-beranda"
        className="mt-5 max-w-4xl font-heading text-[clamp(2.25rem,1.5rem+3.2vw,4rem)] leading-[1.06] font-extrabold tracking-[-0.035em] text-balance"
      >
        {t("titleLead")} <span className="text-text-brand">{t("titleAccent")}</span>
      </h1>
      <p className="mt-5 max-w-2xl text-lg text-text-secondary sm:text-xl">{t("intro")}</p>

      <Form action="/jelajahi" role="search" className="glass-strong mt-8 flex w-full max-w-xl items-center gap-2 rounded-full p-1.5 pl-5 has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-2 has-[input:focus-visible]:outline-focus-ring">
        <label htmlFor="cari-beranda" className="sr-only">
          {t("search.label")}
        </label>
        <Icon icon={IconSearch} className="size-5 text-icon-secondary" />
        {/* Cincin fokus digambar di seluruh kolom pencarian, bukan di input saja. */}
        <input
          id="cari-beranda"
          name="q"
          type="search"
          maxLength={80}
          placeholder={t("search.placeholder")}
          className="min-h-12 min-w-0 flex-1 bg-transparent text-base text-text-primary placeholder:text-text-secondary focus-visible:outline-none"
        />
        <button className={buttonClass("primary", "md")}>{t("search.button")}</button>
      </Form>

      <div className="mt-10 w-full max-w-3xl">
        <LoadErrorBoundary>
          <Suspense fallback={<StatsSkeleton label={t("stats.loading")} />}>
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
    { value: format.number(stats.places ? stats.stepFreeEntrance / stats.places : 0, { style: "percent" }), label: t("stepFree") },
    { value: format.number(stats.contributors), label: t("contributors") },
  ];
  return (
    <dl aria-label={t("label")} className="grid grid-cols-3 gap-2 sm:gap-4">
      {items.map((item) => (
        <div key={item.label} className="glass flex flex-col-reverse gap-1 rounded-2xl px-2 py-4 sm:py-5">
          <dt className="text-sm text-text-secondary">{item.label}</dt>
          <dd className="font-heading text-[clamp(1.75rem,1.4rem+1.5vw,2.5rem)] leading-none font-extrabold tracking-[-0.03em] tabular-nums">
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function StatsSkeleton({ label }: { label: string }) {
  return (
    <div role="status" className="grid grid-cols-3 gap-2 sm:gap-4">
      <span className="sr-only">{label}</span>
      {[0, 1, 2].map((key) => (
        <div key={key} aria-hidden="true" className="glass flex h-[6.25rem] flex-col items-center justify-center gap-2 rounded-2xl">
          <span className="h-8 w-14 rounded-lg bg-surface-brand-subtle" />
          <span className="h-3 w-20 rounded-sm bg-surface-brand-subtle" />
        </div>
      ))}
    </div>
  );
}
