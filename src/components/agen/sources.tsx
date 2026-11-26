"use client";

import Link from "next/link";
import { useFormatter, useTranslations } from "next-intl";
import type { AgentSource } from "@/lib/agen-rute";
import { Icon } from "@/ui/icon";
import { IconChevronRight, IconExternalLink } from "@/ui/icons";

/** Tautan sumber berdiri sendiri di daftar, jadi tingginya paling sedikit 24 px (WCAG 2.5.8). */
const linkClass = "min-h-6 py-0.5 font-semibold text-text-brand underline underline-offset-2";

/**
 * Sumber jawaban Agen AI: data AksesBogor dan potongan basis pengetahuan dengan lisensinya. Dilipat secara bawaan
 * supaya jawaban tetap mudah dibaca; `<details>` bisa dibuka dengan keyboard dan pembaca layar tanpa skrip.
 */
export function Sources({ sources }: { sources: AgentSource[] }) {
  const t = useTranslations("Agen.sumber");
  const format = useFormatter();
  if (sources.length === 0) return null;
  return (
    <details className="group max-w-full self-start rounded-2xl border border-border-subtle bg-surface-raised text-sm">
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-1.5 rounded-2xl px-3 font-semibold hover:bg-surface-hover [&::-webkit-details-marker]:hidden">
        <Icon icon={IconChevronRight} className="size-4 transition-transform duration-200 group-open:rotate-90 motion-reduce:transition-none" />
        {t("title", { count: sources.length })}
      </summary>
      <ul className="flex flex-col gap-2 px-3 pb-3">
        {sources.map((source) =>
          source.type === "lokasi" ? (
            <li key={`lokasi-${source.placeId}`}>
              <Link href={`/lokasi/${source.placeId}`} className={`inline-block ${linkClass}`}>
                {t(source.verifiedBy === "admin" ? "placeAdmin" : "place", { name: source.name, date: format.dateTime(new Date(source.lastVerifiedAt), { dateStyle: "long" }) })}
              </Link>
            </li>
          ) : (
            <li key={`pengetahuan-${source.citation}`}>
              <a href={source.url} target="_blank" rel="noopener noreferrer" className={`inline-flex items-center gap-1 ${linkClass}`}>
                {source.citation}
                <Icon icon={IconExternalLink} className="size-4 shrink-0" />
              </a>
              <span className="block text-text-secondary">{[t("license", { license: source.license }), source.attribution].filter(Boolean).join(" · ")}</span>
            </li>
          ),
        )}
      </ul>
    </details>
  );
}
