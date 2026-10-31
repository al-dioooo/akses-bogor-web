import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { buttonClass } from "@/ui/button-styles";
import { Icon } from "@/ui/icon";
import { IconArrowRight, IconHome } from "@/ui/icons";

export default async function NotFound() {
  const t = await getTranslations("NotFound");
  return (
    <main id="konten" className="page-width flex flex-1 items-center py-(--spacing-3xl)">
      <div className="flex max-w-2xl flex-col items-start gap-6">
        <p className="lbl">{t("eyebrow")}</p>
        <h1 className="display text-[clamp(2.75rem,1.6rem+3.6vw,5rem)] leading-[0.95]">
          {t("title")}
        </h1>
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
