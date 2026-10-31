import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { buttonClass } from "@/ui/button-styles";
import { Icon } from "@/ui/icon";
import { IconCirclePlus } from "@/ui/icons";
import { SectionHeading } from "@/ui/section-heading";

const STEPS = ["lapor", "periksa", "tayang"] as const;

/** Alur data dalam tiga langkah bernomor (ADR-0006, ADR-0019), lalu ajakan melapor. */
export async function Steps() {
  const t = await getTranslations("Beranda");
  return (
    <>
      <section aria-labelledby="judul-alur" className="page-width flex flex-col gap-8">
        <SectionHeading id="judul-alur" eyebrow={t("steps.eyebrow")} title={t("steps.title")} />
        <ol className="grid gap-4 md:grid-cols-3">
          {STEPS.map((step, index) => (
            <li key={step} className="reveal glass flex flex-col gap-3 rounded-2xl p-6">
              <span aria-hidden="true" className="font-heading text-4xl font-extrabold tracking-[-0.04em] text-text-brand tabular-nums">
                {String(index + 1).padStart(2, "0")}
              </span>
              <h3 className="font-heading text-lg font-bold tracking-[-0.02em]">{t(`steps.items.${step}.title`)}</h3>
              <p className="text-text-secondary">{t(`steps.items.${step}.body`)}</p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="judul-ajakan" className="page-width">
        <div className="reveal relative isolate overflow-hidden rounded-2xl bg-surface-inverse px-6 py-10 text-text-on-inverse sm:px-12 sm:py-14">
          <span
            aria-hidden="true"
            className="absolute -top-24 -right-16 -z-10 size-80 rounded-full bg-[radial-gradient(closest-side,var(--color-surface-brand-subtle),transparent)]"
          />
          <h2
            id="judul-ajakan"
            className="max-w-xl font-heading text-[clamp(1.75rem,1.25rem+2vw,2.5rem)] leading-[1.12] font-extrabold tracking-[-0.03em]"
          >
            {t("cta.title")}
          </h2>
          <p className="mt-3 max-w-xl text-lg text-text-on-inverse-secondary">{t("cta.body")}</p>
          <Link href="/laporkan" className={buttonClass("primary", "lg", "mt-8")}>
            <Icon icon={IconCirclePlus} />
            {t("cta.button")}
          </Link>
        </div>
      </section>
    </>
  );
}
