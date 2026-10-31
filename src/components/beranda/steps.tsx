import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { buttonClass } from "@/ui/button-styles";
import { Icon } from "@/ui/icon";
import { IconCirclePlus } from "@/ui/icons";

const STEPS = ["lapor", "periksa", "tayang"] as const;

/** Alur data dalam tiga langkah (ADR-0006, ADR-0019) di pita ungu, lalu ajakan melapor. */
export async function Steps() {
  const t = await getTranslations("Beranda");
  return (
    <>
      <section aria-labelledby="judul-alur" className="bg-brand-fill py-(--spacing-4xl) text-text-on-brand">
        <div className="page-width flex flex-col gap-14">
          <div className="flex flex-col items-start gap-4">
            <p className="font-mono text-xs font-medium tracking-[0.08em] uppercase">{t("steps.eyebrow")}</p>
            <h2 id="judul-alur" className="display text-[clamp(2.25rem,1.4rem+2.6vw,3.75rem)] leading-none">
              {t("steps.title")} <span className="font-accent font-normal italic">{t("steps.accent")}</span>
            </h2>
          </div>
          <ol className="grid gap-10 border-t-2 border-text-on-brand/40 pt-8 md:grid-cols-3 md:gap-8">
            {STEPS.map((step, index) => (
              <li key={step} className="flex flex-col gap-3">
                <span aria-hidden="true" className="font-mono text-sm font-semibold tabular-nums">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h3 className="display text-[clamp(2rem,1.5rem+1.5vw,2.75rem)] leading-none">{t(`steps.items.${step}.title`)}</h3>
                <p className="max-w-xs">{t(`steps.items.${step}.body`)}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section aria-labelledby="judul-ajakan" className="page-width pt-(--spacing-4xl)">
        <div className="reveal flex flex-col items-start gap-5 rounded-[2rem] bg-surface-inverse px-6 py-12 text-text-on-inverse sm:px-12 sm:py-16">
          <h2 id="judul-ajakan" className="display max-w-2xl text-[clamp(2.25rem,1.4rem+2.8vw,4rem)] leading-none">
            {t("cta.title")} <span className="font-accent font-normal italic">{t("cta.accent")}</span>
          </h2>
          <p className="max-w-xl text-lg text-text-on-inverse-secondary">{t("cta.body")}</p>
          <Link href="/laporkan" className={buttonClass("primary", "lg", "mt-3")}>
            <Icon icon={IconCirclePlus} />
            {t("cta.button")}
          </Link>
        </div>
      </section>
    </>
  );
}
