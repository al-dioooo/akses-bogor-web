"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import type { DistrictPriority } from "@/lib/api";
import { LEVEL_COLOR, LEVELS } from "@/components/prioritas/levels";
import { Icon } from "@/ui/icon";
import { IconArrowRight, IconChevronRight, IconList } from "@/ui/icons";
import { BoundariesCredit } from "./priority-legend";

/**
 * Kunci lapisan prioritas kecamatan yang mengambang di atas peta selama lapisan menyala (ADR-0043): empat tingkat
 * sebagai teks di samping warnanya, catatan batas data dan sumbernya (selalu ikut bersama warna dari angka Dinsos),
 * tombol ke tabel di panel daftar, dan jalan ke Bantu memetakan.
 *
 * Di ponsel kunci mulai ringkas, satu baris dengan skala warna dan tombol "Catatan" yang membuka seluruh isinya, supaya
 * lapisan berwarna tetap terlihat. Tingginya dibatasi supaya tidak masuk ke balik panel daftar: isi yang tidak muat
 * digulir dan kunci bisa difokus untuk itu, dan bila satu baris pun tidak muat, komponen peta menyembunyikannya (tabel
 * dengan catatan yang sama ada di panel daftar).
 */
export function PriorityKey({
  priority,
  failed,
  attribution,
  compact,
  onShowTable,
}: {
  priority: DistrictPriority;
  /** Batas kecamatan gagal dimuat: lapisan tidak tampil, tetapi tabel tetap ada. */
  failed: boolean;
  attribution: string | null;
  /** Ponsel: kunci mulai ringkas. */
  compact: boolean;
  onShowTable: () => void;
}) {
  const t = useTranslations("Peta.prioritas");
  const tp = useTranslations("PrioritasKecamatan");
  const tb = useTranslations("BantuMemetakan.entry");
  const section = useRef<HTMLElement>(null);
  const [chosen, setChosen] = useState<boolean | null>(null);
  // Pesan galat batas kecamatan selalu tampil, juga di ponsel.
  const open = failed || (chosen ?? !compact);

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
    <section ref={section} aria-labelledby="judul-kunci-prioritas" className={`peta-kunci panel-raised flex flex-col rounded-2xl ${open ? "gap-3 p-4" : "py-1 pr-2 pl-3.5"}`}>
      <div className="flex items-center gap-1">
        <h2 id="judul-kunci-prioritas" className={open ? "mr-auto font-heading leading-tight font-bold" : "sr-only"}>
          {tp("title", { year: priority.year })}
        </h2>
        {!open && (
          // Baris ringkas: skala warna dari rendah ke sangat tinggi; nama setiap tingkat ada di isi kunci.
          <p aria-hidden="true" className="mr-auto inline-flex min-w-0 items-center gap-2 text-sm font-bold">
            <span className="flex shrink-0 gap-0.5">
              {LEVELS.map((level) => (
                <span key={level} className="size-3.5 rounded-sm border border-border-strong" style={{ background: `var(${LEVEL_COLOR[level]})` }} />
              ))}
            </span>
            <span className="truncate">{t("keyShort", { year: priority.year })}</span>
          </p>
        )}
        {open && (
          <button
            type="button"
            onClick={onShowTable}
            aria-label={t("showTable")}
            className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full px-3 text-sm font-bold hover:bg-surface-hover"
          >
            <Icon icon={IconList} className="size-4.5" />
            {t("table")}
          </button>
        )}
        <button
          type="button"
          aria-expanded={open}
          aria-controls="isi-kunci-prioritas"
          aria-label={open ? t("less") : t("moreLabel")}
          onClick={() => setChosen(!open)}
          className="-mr-1 inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-1 rounded-full px-2.5 text-sm font-bold hover:bg-surface-hover"
        >
          {!open && t("more")}
          <Icon icon={IconChevronRight} className={`size-5 transition-transform duration-200 ${open ? "-rotate-90" : "rotate-90"}`} />
        </button>
      </div>
      <div id="isi-kunci-prioritas" hidden={!open} className="flex flex-col gap-3">
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
        <p className="text-sm text-text-secondary">
          <span className="font-bold text-text-primary">{t("caveatLabel")} </span>
          {priority.caveat}
        </p>
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
      </div>
    </section>
  );
}
