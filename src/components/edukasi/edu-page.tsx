import Link from "next/link";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { buttonClass } from "@/ui/button-styles";
import { DraftNotice } from "@/ui/draft-notice";
import { Icon } from "@/ui/icon";
import { IconArrowRight, IconCirclePlus, IconExternalLink } from "@/ui/icons";
import { PageRow } from "@/ui/page-row";
import { EDU_PAGES, type EduNamespace, type EduSource } from "./pages";

export const EDU_LINK = "inline-flex min-h-11 items-center gap-1.5 font-semibold text-text-brand underline underline-offset-2";

/**
 * Kerangka halaman edukasi (ADR-0041), mengikuti tata letak Tentang: judul, tanda draf, bagian-bagian halaman, daftar
 * sumber, tautan ke halaman edukasi lain, lalu ajakan ke Jelajahi dan Laporkan. Isi setiap bagian dikirim lewat
 * `children` dan ditulis di `messages/id.json`.
 */
export async function EduPage({ namespace, children }: { namespace: EduNamespace; children: ReactNode }) {
  const [t, te] = await Promise.all([getTranslations(namespace), getTranslations("Edukasi")]);
  const sources = t.raw("sources") as EduSource[];
  const related = await Promise.all(
    EDU_PAGES.filter((page) => page.namespace !== namespace).map(async (page) => {
      const tp = await getTranslations(page.namespace);
      return { href: page.href, title: tp("metaTitle"), description: tp("related") };
    }),
  );
  return (
    <main id="konten" className="page-width flex flex-1 flex-col py-10 sm:py-16">
      <div className="flex max-w-3xl flex-col items-start gap-5">
        <p className="lbl">{te("eyebrow")}</p>
        <h1 className="display text-[clamp(2.5rem,1.6rem+3vw,4rem)] leading-none">
          {t("title")}
          <span className="accent"> {t("accent")}</span>
        </h1>
        <p className="text-xl text-text-secondary">{t("intro")}</p>
        <DraftNotice>{te("draft")}</DraftNotice>
      </div>

      <div className="mt-10">
        {children}
        <PageRow id="sumber" title={te("sourcesTitle")}>
          <ul className="flex list-disc flex-col gap-3 pl-6">
            {sources.map((source) => (
              <li key={source.text}>
                {source.text}
                {source.href && (
                  <>
                    {" "}
                    <a href={source.href} className={EDU_LINK}>
                      {source.link}
                      <Icon icon={IconExternalLink} className="size-4" />
                    </a>
                  </>
                )}
              </li>
            ))}
          </ul>
        </PageRow>
        {related.length > 0 && (
          <PageRow id="baca-juga" title={te("relatedTitle")}>
            <ul className="flex flex-col gap-4">
              {related.map((page) => (
                <li key={page.href} className="flex flex-col items-start">
                  <Link href={page.href} className={EDU_LINK}>
                    {page.title}
                    <Icon icon={IconArrowRight} className="size-4" />
                  </Link>
                  <p className="text-text-secondary">{page.description}</p>
                </li>
              ))}
            </ul>
          </PageRow>
        )}
      </div>

      <section aria-labelledby="ajakan" className="mt-6 flex flex-col items-start gap-5 rounded-[2rem] bg-surface-brand-subtle p-6 sm:p-10">
        <h2 id="ajakan" className="display text-[clamp(1.75rem,1.3rem+1.6vw,2.5rem)] leading-tight">
          {te("cta.title")}
        </h2>
        <p className="max-w-xl text-lg">{te("cta.body")}</p>
        <div className="flex flex-wrap gap-3">
          <Link href="/jelajahi" className={buttonClass("primary", "md")}>
            {te("cta.explore")}
            <Icon icon={IconArrowRight} />
          </Link>
          <Link href="/laporkan" className={buttonClass("outline", "md")}>
            <Icon icon={IconCirclePlus} />
            {te("cta.report")}
          </Link>
        </div>
      </section>
    </main>
  );
}
