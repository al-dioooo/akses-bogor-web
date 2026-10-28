import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { buttonClass } from "@/ui/button-styles";
import { Icon } from "@/ui/icon";
import { IconArrowRight, IconHome } from "@/ui/icons";

export default async function NotFound() {
  const t = await getTranslations("NotFound");
  return (
    <main id="konten" className="page-width flex flex-1 items-center py-(--spacing-3xl)">
      <div className="glass mx-auto flex max-w-xl flex-col items-start gap-5 rounded-2xl p-8 sm:p-10">
        <span className="eyebrow glass">{t("eyebrow")}</span>
        <h1 className="font-heading text-[clamp(2rem,1.5rem+2vw,2.75rem)] leading-[1.1] font-extrabold tracking-[-0.03em]">
          {t("title")}
        </h1>
        <p className="text-lg text-text-secondary">{t("body")}</p>
        <div className="flex flex-wrap gap-3">
          <Link href="/" className={buttonClass("primary", "md")}>
            <Icon icon={IconHome} />
            {t("home")}
          </Link>
          <Link href="/jelajahi" className={buttonClass("glass", "md")}>
            {t("explore")}
            <Icon icon={IconArrowRight} />
          </Link>
        </div>
      </div>
    </main>
  );
}
