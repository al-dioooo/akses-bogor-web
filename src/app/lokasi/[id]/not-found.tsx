import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { buttonClass } from "@/ui/button-styles";
import { Icon } from "@/ui/icon";
import { IconArrowRight } from "@/ui/icons";

/** Lokasi yang tidak ada atau id yang tidak valid. Menggantikan seluruh halaman Detail. */
export default async function LokasiNotFound() {
  const t = await getTranslations("Detail.notFound");
  return (
    <main id="konten" className="page-width flex flex-1 items-center py-(--spacing-3xl)">
      <div className="panel mx-auto flex max-w-xl flex-col items-start gap-5 rounded-2xl p-8 sm:p-10">
        <span className="lbl">{t("eyebrow")}</span>
        <h1 className="font-heading text-[clamp(2rem,1.5rem+2vw,2.75rem)] leading-[1.1] font-extrabold tracking-[-0.03em]">
          {t("title")}
        </h1>
        <p className="text-lg text-text-secondary">{t("body")}</p>
        <Link href="/jelajahi" className={buttonClass("primary", "md")}>
          {t("explore")}
          <Icon icon={IconArrowRight} />
        </Link>
      </div>
    </main>
  );
}
