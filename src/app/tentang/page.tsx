import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { PRIVACY_POLICY_PATH, TERMS_PATH } from "@/lib/kebijakan";
import { buttonClass } from "@/ui/button-styles";
import { Icon } from "@/ui/icon";
import { IconAccessible, IconArrowRight, IconBuilding, IconCirclePlus, IconInfoCircle, IconMapPin, type Glyph } from "@/ui/icons";

type Fact = { value: string; label: string; detail: string };
type Step = { title: string; body: string };

const FACT_ICONS: Glyph[] = [IconMapPin, IconBuilding, IconAccessible];
const LINK = "inline-flex min-h-11 items-center gap-1.5 font-semibold text-text-brand underline underline-offset-2";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Tentang");
  return { title: t("metaTitle") };
}

/** Tentang (FR-50): apa itu AksesBogor, cara datanya dikumpulkan, batasnya, sumber data, dan kontak. Halaman statis. */
export default async function Tentang() {
  const t = await getTranslations("Tentang");
  const facts = t.raw("facts") as Fact[];
  const steps = t.raw("process.steps") as Step[];
  return (
    <main id="konten" className="page-width flex flex-1 flex-col py-10 sm:py-16">
      <div className="flex max-w-3xl flex-col items-start gap-5">
        <p className="lbl">{t("eyebrow")}</p>
        <h1 className="display text-[clamp(2.5rem,1.6rem+3vw,4rem)] leading-none">
          {t("title")}
          <span className="accent"> {t("accent")}</span>
        </h1>
        <p className="text-xl text-text-secondary">{t("intro")}</p>
      </div>

      <ul aria-label={t("factsLabel")} className="mt-10 grid gap-4 sm:grid-cols-3">
        {facts.map((fact, index) => (
          <li key={fact.label} className="flex flex-col gap-3 rounded-3xl border border-border-subtle bg-surface-raised p-6">
            <Icon icon={FACT_ICONS[index] ?? IconInfoCircle} className="size-7 text-icon-brand" />
            <p className="flex items-baseline gap-2">
              <span className="font-heading text-5xl leading-none font-extrabold">{fact.value}</span>
              <span className="font-semibold">{fact.label}</span>
            </p>
            <p className="text-text-secondary">{fact.detail}</p>
          </li>
        ))}
      </ul>

      <div className="mt-6">
        <Row id="untuk-siapa" title={t("forWhom.title")}>
          <p>{t("forWhom.body")}</p>
        </Row>
        <Row id="cara-kerja" title={t("process.title")}>
          <ol className="flex flex-col gap-5">
            {steps.map((step, index) => (
              <li key={step.title} className="grid grid-cols-[auto_minmax(0,1fr)] gap-4">
                <span
                  aria-hidden="true"
                  className="grid size-11 place-items-center rounded-full bg-surface-brand-subtle font-mono text-base font-medium text-text-brand"
                >
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div>
                  <h3 className="font-heading text-xl font-bold">{step.title}</h3>
                  <p className="text-text-secondary">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
          <p>{t("process.after")}</p>
        </Row>
        <Row id="batas" title={t("limits.title")}>
          <ul className="flex list-disc flex-col gap-2 pl-6">
            {(t.raw("limits.items") as string[]).map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </Row>
        <Row id="tim" title={t("team.title")}>
          <p>{t("team.body")}</p>
          <p className="text-text-secondary">{t("team.pending")}</p>
        </Row>
        <Row id="sumber-data" title={t("sources.title")}>
          <ul className="flex list-disc flex-col gap-2 pl-6">
            {(t.raw("sources.items") as string[]).map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </Row>
        <Row id="aksesibilitas" title={t("accessibility.title")}>
          <p>{t("accessibility.body")}</p>
        </Row>
        <Row id="kontak" title={t("contact.title")}>
          <p>{t("contact.pending")}</p>
          <div>
            <h3 className="lbl mb-1">{t("contact.readAlso")}</h3>
            <ul className="flex flex-wrap gap-x-6">
              <li>
                <Link href={PRIVACY_POLICY_PATH} className={LINK}>
                  {t("contact.privacy")}
                </Link>
              </li>
              <li>
                <Link href={TERMS_PATH} className={LINK}>
                  {t("contact.terms")}
                </Link>
              </li>
            </ul>
          </div>
        </Row>
      </div>

      <section aria-labelledby="ajakan" className="mt-6 flex flex-col items-start gap-5 rounded-[2rem] bg-surface-brand-subtle p-6 sm:p-10">
        <h2 id="ajakan" className="display text-[clamp(1.75rem,1.3rem+1.6vw,2.5rem)] leading-tight">
          {t("cta.title")}
        </h2>
        <p className="max-w-xl text-lg">{t("cta.body")}</p>
        <div className="flex flex-wrap gap-3">
          <Link href="/laporkan" className={buttonClass("primary", "md")}>
            <Icon icon={IconCirclePlus} />
            {t("cta.report")}
          </Link>
          <Link href="/jelajahi" className={buttonClass("outline", "md")}>
            {t("cta.explore")}
            <Icon icon={IconArrowRight} />
          </Link>
        </div>
      </section>
    </main>
  );
}

/** Satu bagian: judul di kiri dan isi di kanan mulai layar sedang, bertumpuk di ponsel. */
function Row({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="grid gap-4 border-t border-border-subtle py-10 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] md:gap-10">
      <h2 id={id} className="font-heading text-2xl font-bold md:text-3xl">
        {title}
      </h2>
      <div className="flex max-w-[65ch] flex-col gap-4 text-lg">{children}</div>
    </section>
  );
}
