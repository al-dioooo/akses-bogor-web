import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { EDU_LINK, EduPage } from "@/components/edukasi/edu-page";
import { Icon } from "@/ui/icon";
import { IconArrowRight } from "@/ui/icons";
import { PageRow } from "@/ui/page-row";

type Word = { term: string; body: string };

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Disabilitas");
  return { title: t("metaTitle") };
}

/**
 * Mengenal disabilitas (FR-51, ADR-0041): definisi dari UU No. 8 Tahun 2016, hambatan di lingkungan, kebutuhan yang
 * berbeda, dan kata yang dipakai AksesBogor. Kutipan undang-undang ditulis persis seperti teks aslinya.
 */
export default async function Disabilitas() {
  const t = await getTranslations("Disabilitas");
  const words = t.raw("words.items") as Word[];
  return (
    <EduPage namespace="Disabilitas">
      <PageRow id="arti" title={t("meaning.title")}>
        <p>{t("meaning.lead")}</p>
        <figure className="flex flex-col gap-3 rounded-3xl border-l-4 border-brand-fill bg-surface-raised p-5 sm:p-6">
          <blockquote className="font-heading text-xl leading-snug">
            <p>&ldquo;{t("meaning.quote")}&rdquo;</p>
          </blockquote>
          <figcaption className="font-mono text-sm text-text-secondary">{t("meaning.cite")}</figcaption>
        </figure>
        <p>{t("meaning.after")}</p>
      </PageRow>

      <PageRow id="hambatan" title={t("barriers.title")}>
        {(t.raw("barriers.paragraphs") as string[]).map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </PageRow>

      <PageRow id="kebutuhan" title={t("needs.title")}>
        {(t.raw("needs.paragraphs") as string[]).map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
        <p>
          <Link href="/aksesibilitas#fasilitas" className={EDU_LINK}>
            {t("needs.link")}
            <Icon icon={IconArrowRight} className="size-4" />
          </Link>
        </p>
      </PageRow>

      <PageRow id="kata" title={t("words.title")}>
        <dl className="flex flex-col gap-4">
          {words.map((word) => (
            <div key={word.term} className="flex flex-col gap-1 rounded-3xl border border-border-subtle bg-surface-raised p-5">
              <dt className="font-heading text-lg font-bold">{word.term}</dt>
              <dd className="text-base text-text-secondary">{word.body}</dd>
            </div>
          ))}
        </dl>
        <p className="font-semibold">{t("words.ask")}</p>
      </PageRow>

      <PageRow id="terlibat" title={t("community.title")}>
        <p>{t("community.body")}</p>
        <p>
          <Link href="/tentang#kontak" className={EDU_LINK}>
            {t("community.link")}
            <Icon icon={IconArrowRight} className="size-4" />
          </Link>
        </p>
      </PageRow>
    </EduPage>
  );
}
