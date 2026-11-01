import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { buttonClass } from "@/ui/button-styles";
import { Icon } from "@/ui/icon";
import { IconCirclePlus, IconUser } from "@/ui/icons";
import { ActiveBottomNav, BottomNav, type BottomNavLabels } from "./bottom-nav";
import { DisplaySettings } from "./display-settings";
import { Logo } from "./logo";
import { ActiveMainNavList, MainNavList, StickyHeader, type NavLabels } from "./nav-links";

async function navLabels() {
  const t = await getTranslations("Nav");
  const labels: NavLabels = {
    beranda: t("beranda"),
    jelajahi: t("jelajahi"),
    peta: t("peta"),
    aksesibilitas: t("aksesibilitas"),
    difabel: t("difabel"),
    tips: t("tips"),
    tentang: t("tentang"),
    laporkan: t("laporkan"),
  };
  return { t, labels };
}

/** Nav bar desktop dan App bar ponsel. Tab aktif ditandai setelah alamat halaman diketahui. */
export async function SiteHeader() {
  const { t, labels } = await navLabels();
  const tl = await getTranslations("Layout");
  const td = await getTranslations("Tampilan");
  return (
    <StickyHeader>
      <div className="page-width flex min-h-19 items-center justify-between gap-3">
        <Link href="/" aria-label={tl("home")} className="rounded-xl py-1">
          <Logo />
        </Link>
        <nav aria-label={t("label")} className="hidden lg:block">
          <Suspense fallback={<MainNavList labels={labels} pathname={null} />}>
            <ActiveMainNavList labels={labels} />
          </Suspense>
        </nav>
        <div className="flex items-center gap-1">
          <DisplaySettings
            labels={{
              open: td("open"),
              title: td("title"),
              mode: td("mode"),
              modeHint: td("modeHint"),
              theme: { perangkat: td("theme.perangkat"), terang: td("theme.terang"), gelap: td("theme.gelap") },
              motion: td("motion"),
              motionHint: td("motionHint"),
              motionOption: { perangkat: td("motionOption.perangkat"), off: td("motionOption.off") },
              done: td("done"),
            }}
          />
          <Link href="/masuk" className={buttonClass("ghost", "sm")}>
            <Icon icon={IconUser} className="size-5 lg:hidden" />
            {/* Di layar 320 px label disembunyikan secara visual, tetap menjadi nama tombol. */}
            <span className="max-[24rem]:sr-only">{t("masuk")}</span>
          </Link>
          <Link href="/laporkan" className={buttonClass("primary", "sm", "max-lg:hidden")}>
            <Icon icon={IconCirclePlus} />
            {t("laporkanTempat")}
          </Link>
        </div>
      </div>
    </StickyHeader>
  );
}

export async function SiteBottomNav() {
  const { t, labels } = await navLabels();
  const bottomLabels: BottomNavLabels = {
    ...labels,
    label: t("bottomLabel"),
    lainnya: t("lainnya"),
    lainnyaTitle: t("lainnyaTitle"),
    masuk: t("masuk"),
    tutup: t("tutup"),
  };
  return (
    <Suspense fallback={<BottomNav labels={bottomLabels} pathname={null} />}>
      <ActiveBottomNav labels={bottomLabels} />
    </Suspense>
  );
}
