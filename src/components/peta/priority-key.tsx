"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useEffect, useRef } from "react";
import type { DistrictPriority } from "@/lib/api";
import { LEVEL_COLOR, LEVELS } from "@/components/prioritas/levels";
import { Icon } from "@/ui/icon";
import { IconArrowRight, IconList } from "@/ui/icons";
import { BoundariesCredit } from "./priority-legend";

/**
 * Kunci lapisan prioritas kecamatan yang mengambang di atas peta selama lapisan menyala (ADR-0043): empat tingkat
 * sebagai teks di samping warnanya, catatan batas data dan sumbernya (selalu tampil bersama warna dari angka Dinsos),
 * tombol ke tabel di panel daftar, dan jalan ke Bantu memetakan untuk yang ingin mengisi data di kecamatan itu. Tingginya
 * dibatasi supaya tidak masuk ke balik panel daftar; di layar pendek isinya digulir, dan kunci bisa difokus untuk itu.
 */
export function PriorityKey({
  priority,
  failed,
  attribution,
  onShowTable,
}: {
  priority: DistrictPriority;
  /** Batas kecamatan gagal dimuat: lapisan tidak tampil, tetapi tabel tetap ada. */
  failed: boolean;
  attribution: string | null;
  onShowTable: () => void;
}) {
  const t = useTranslations("Peta.prioritas");
  const tp = useTranslations("PrioritasKecamatan");
  const tb = useTranslations("BantuMemetakan.entry");
  const section = useRef<HTMLElement>(null);

  // Kunci yang harus digulir masuk urutan Tab, supaya isinya bisa digulir dengan tombol panah.
  useEffect(() => {
    const element = section.current;
    if (!element) return;
    const observer = new ResizeObserver(() => {
      if (element.scrollHeight > element.clientHeight + 1) element.tabIndex = 0;
      else element.removeAttribute("tabindex");
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={section}
      aria-labelledby="judul-kunci-prioritas"
      className="peta-kunci panel-raised flex flex-col gap-3 rounded-2xl p-4"
    >
      <div className="flex items-center gap-1">
        <h2 id="judul-kunci-prioritas" className="mr-auto font-heading leading-tight font-bold">
          {tp("title", { year: priority.year })}
        </h2>
        <button
          type="button"
          onClick={onShowTable}
          aria-label={t("showTable")}
          className="-mr-2 inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full px-3 text-sm font-bold hover:bg-surface-hover"
        >
          <Icon icon={IconList} className="size-4.5" />
          {t("table")}
        </button>
      </div>
      {failed ? (
        <p role="alert" className="rounded-xl bg-status-partial-bg p-3 text-sm text-text-primary">
          {t("failed")}
        </p>
      ) : (
        <ul aria-label={t("legend")} className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-sm">
          {LEVELS.map((level) => (
            <li key={level} className="inline-flex items-center gap-2">
              <span aria-hidden="true" className="size-4 shrink-0 rounded-sm border border-border-strong" style={{ background: `var(${LEVEL_COLOR[level]})` }} />
              {tp(`tingkat.${level}`)}
            </li>
          ))}
        </ul>
      )}
      <p className="text-sm text-text-secondary">{priority.caveat}</p>
      <p className="text-sm text-text-secondary">
        {t("source", { publisher: priority.source.publisher })}
        {attribution && (
          <>
            {" "}
            <BoundariesCredit attribution={attribution} />
          </>
        )}
      </p>
      <Link href="/laporkan/bantu-memetakan" className="inline-flex min-h-11 items-center gap-1.5 self-start text-sm font-bold text-text-brand underline underline-offset-2">
        {tb("link")}
        <Icon icon={IconArrowRight} className="size-4" />
      </Link>
    </section>
  );
}
