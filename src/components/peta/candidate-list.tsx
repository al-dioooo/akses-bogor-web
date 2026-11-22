"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { candidateReportHref } from "@/lib/kandidat";
import { buttonClass } from "@/ui/button-styles";
import { Icon } from "@/ui/icon";
import { IconMapPin, IconMessageReport } from "@/ui/icons";
import { CandidateDot } from "./candidate-dot";
import type { MapCandidate } from "./places";

/** Kandidat yang ditampilkan sekaligus, supaya urutan Tab di panel tetap pendek. */
const PAGE = 20;

/**
 * Bagian "Belum ada data (n)" di panel daftar (ADR-0049): alternatif untuk lapisan kandidat, yang tidak bisa difokus di
 * peta. Isinya mengikuti bagian peta yang terlihat, seperti daftar lokasi, dan ditampilkan bertahap. Setiap baris punya
 * Laporkan tempat ini dan, selama peta tampil, Tunjukkan di peta yang membuka kartunya.
 */
export function CandidateList({ candidates, onShow }: { candidates: MapCandidate[]; onShow?: (id: string) => void }) {
  const t = useTranslations("Peta");
  const tk = useTranslations("Kategori");
  const [limit, setLimit] = useState(PAGE);
  const list = useRef<HTMLUListElement>(null);
  // Setelah "Tampilkan lagi", fokus pindah ke baris pertama yang baru muncul.
  const focusFrom = useRef<number | null>(null);
  useEffect(() => {
    if (focusFrom.current === null) return;
    list.current?.querySelectorAll<HTMLElement>("[data-laporkan]")[focusFrom.current]?.focus();
    focusFrom.current = null;
  });

  const visible = candidates.slice(0, limit);
  const rest = candidates.length - visible.length;
  return (
    <section aria-labelledby="judul-kandidat" className="flex flex-col gap-2">
      <h3 id="judul-kandidat" className="flex items-center gap-2 font-heading text-lg font-bold">
        <CandidateDot />
        {t("kandidat.listTitle", { count: candidates.length })}
      </h3>
      <p className="text-sm text-text-secondary">{t("kandidat.listBody")}</p>
      {candidates.length === 0 ? (
        <p className="rounded-2xl bg-bg-sunken p-4 text-text-secondary">{t("kandidat.listNone")}</p>
      ) : (
        <ul ref={list} aria-labelledby="judul-kandidat" className="flex flex-col">
          {visible.map((candidate) => {
            const name = candidate.name ?? t("kandidat.unnamed", { category: tk(candidate.category) });
            return (
              <li key={candidate.id} className="flex items-center gap-3 border-t border-border-subtle py-2 first:border-t-0">
                <div className="flex min-w-0 flex-1 flex-col items-start">
                  <h4 className="pt-1 font-heading text-base leading-snug font-bold">{name}</h4>
                  <p className="text-sm text-text-secondary">
                    {tk(candidate.category)} · {candidate.district}
                  </p>
                  <Link
                    href={candidateReportHref(candidate)}
                    data-laporkan
                    aria-label={t("kandidat.reportPlace", { name })}
                    className="inline-flex min-h-11 items-center gap-1.5 text-sm font-bold text-text-brand underline underline-offset-2"
                  >
                    <Icon icon={IconMessageReport} className="size-4" />
                    {t("kandidat.report")}
                  </Link>
                </div>
                {onShow && (
                  <button
                    type="button"
                    onClick={() => onShow(candidate.id)}
                    data-tunjukkan={candidate.id}
                    aria-label={t("list.showPlace", { name })}
                    className="grid size-11 shrink-0 place-items-center rounded-full border-2 border-border-subtle hover:border-border-strong hover:bg-surface-hover"
                  >
                    <Icon icon={IconMapPin} />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {rest > 0 && (
        <button
          type="button"
          onClick={() => {
            focusFrom.current = limit;
            setLimit(limit + PAGE);
          }}
          className={buttonClass("outline", "sm", "self-start")}
        >
          {t("kandidat.more", { count: Math.min(rest, PAGE) })}
        </button>
      )}
    </section>
  );
}
