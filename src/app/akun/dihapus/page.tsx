import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ClearDrafts } from "@/components/akun/clear-drafts";
import { buttonClass } from "@/ui/button-styles";
import { Icon } from "@/ui/icon";
import { IconArrowRight, IconHome } from "@/ui/icons";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("AkunDihapus");
  return { title: t("metaTitle"), robots: { index: false } };
}

/** Konfirmasi setelah akun dihapus (ADR-0024). Halaman statis: sesi sudah tidak ada. */
export default async function AkunDihapus() {
  const t = await getTranslations("AkunDihapus");
  return (
    <main id="konten" className="page-width flex flex-1 items-center py-16">
      <ClearDrafts />
      <div className="flex max-w-2xl flex-col items-start gap-6">
        <p className="lbl">{t("eyebrow")}</p>
        <h1 className="display text-[clamp(2.5rem,1.6rem+3vw,4rem)] leading-none">{t("title")}</h1>
        <p className="text-lg text-text-secondary">{t("body")}</p>
        <div className="flex flex-wrap gap-3">
          <Link href="/" className={buttonClass("primary", "md")}>
            <Icon icon={IconHome} />
            {t("home")}
          </Link>
          <Link href="/jelajahi" className={buttonClass("outline", "md")}>
            {t("explore")}
            <Icon icon={IconArrowRight} />
          </Link>
        </div>
      </div>
    </main>
  );
}
