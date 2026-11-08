"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Icon } from "@/ui/icon";
import { IconClipboardCheck, IconMessage, IconUsers, type Glyph } from "@/ui/icons";

const TABS: { href: string; key: "antrean" | "jawaban" | "tim"; icon: Glyph; admin?: boolean }[] = [
  { href: "/verifikasi", key: "antrean", icon: IconClipboardCheck },
  { href: "/verifikasi/jawaban", key: "jawaban", icon: IconMessage },
  { href: "/verifikasi/tim", key: "tim", icon: IconUsers, admin: true },
];

/** Bagian meja verifikasi. Bagian yang sedang dibuka ditandai `aria-current="page"`, bukan hanya warna. */
export function DeskNav({ admin }: { admin: boolean }) {
  const t = useTranslations("Verifikasi.nav");
  const pathname = usePathname();
  return (
    <nav aria-label={t("label")}>
      <ul className="flex flex-wrap gap-2">
        {TABS.filter((tab) => admin || !tab.admin).map(({ href, key, icon }) => {
          const current = pathname === href;
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={current ? "page" : undefined}
                className={`inline-flex min-h-11 items-center gap-2 rounded-full border-2 px-4 font-semibold transition-colors ${
                  current ? "border-border-strong bg-text-primary text-bg-canvas" : "border-border-subtle hover:border-border-strong"
                }`}
              >
                <Icon icon={icon} className="size-4.5" />
                {t(key)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
