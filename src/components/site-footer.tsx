import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Icon } from "@/ui/icon";
import { IconArrowUp } from "@/ui/icons";
import { Logo } from "./logo";

const LINK = "inline-flex min-h-11 items-center text-text-on-inverse-secondary hover:text-text-on-inverse hover:underline";

/** Footer di atas `surface/inverse`, bukan kaca gelap, supaya teks sekunder tetap kontras (Fondasi Visual). */
export async function SiteFooter() {
  const t = await getTranslations("Footer");
  const nav = await getTranslations("Nav");
  const columns = [
    {
      title: t("jelajahi"),
      links: [
        { href: "/", label: nav("beranda") },
        { href: "/jelajahi", label: nav("jelajahi") },
        { href: "/peta", label: nav("peta") },
        { href: "/laporkan", label: nav("laporkanTempat") },
      ],
    },
    {
      title: t("informasi"),
      links: [
        { href: "/aksesibilitas", label: nav("aksesibilitas") },
        { href: "/difabel", label: nav("difabel") },
        { href: "/tips", label: nav("tips") },
        { href: "/tentang", label: nav("tentang") },
      ],
    },
    {
      title: t("kebijakan"),
      links: [
        { href: "/privasi", label: t("privasi") },
        { href: "/syarat", label: t("syarat") },
      ],
    },
  ];
  return (
    <footer className="mt-(--spacing-4xl) overflow-hidden bg-surface-inverse text-text-on-inverse">
      <div className="page-width grid gap-10 pt-14 pb-8 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div className="flex flex-col gap-4">
          <Logo inverse />
          <p className="max-w-xs text-text-on-inverse-secondary">{t("tagline")}</p>
        </div>
        {columns.map((column) => (
          <div key={column.title}>
            <h2 className="mb-2 text-sm font-semibold tracking-[0.08em] uppercase">{column.title}</h2>
            <ul>
              {column.links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className={LINK}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="page-width flex flex-wrap items-center justify-between gap-2 border-t border-text-on-inverse/15 py-4 text-sm">
        <p className="text-text-on-inverse-secondary">{t("copyright")}</p>
        <a href="#atas" className={`${LINK} gap-1.5`}>
          {t("toTop")}
          <Icon icon={IconArrowUp} className="size-4" />
        </a>
      </div>
      {/* Wordmark raksasa hanya hiasan, jadi digambar lewat CSS dan tidak dibaca sebagai teks. */}
      <div
        aria-hidden="true"
        className="page-width -mb-[0.22em] font-heading text-[clamp(4rem,17vw,15rem)] leading-none font-extrabold tracking-[-0.06em] text-text-on-inverse/10 select-none after:content-['AksesBogor']"
      />
    </footer>
  );
}
