"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState } from "react";
import type { DistrictPriority } from "@/lib/api";
import { LEVEL_COLOR, LEVELS } from "@/components/prioritas/levels";
import { Icon } from "@/ui/icon";
import { IconArrowRight, IconChevronRight, IconList } from "@/ui/icons";

/**
 * Kunci lapisan prioritas kecamatan yang mengambang di atas peta selama lapisan menyala (ADR-0043): empat tingkat
 * sebagai teks di samping warnanya, catatan batas data dan sumbernya (selalu ikut bersama angka Dinsos), tombol ke tabel
 * di panel daftar, dan jalan ke Bantu memetakan untuk yang ingin mengisi data di kecamatan itu. Catatan dan sumber
 * terbuka setiap kali lapisan dinyalakan; di layar kecil pengguna boleh melipatnya supaya peta terlihat.
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
  const [open, setOpen] = useState(true);
  return (
    <section aria-labelledby="judul-kunci-prioritas" className="peta-kunci panel-raised flex flex-col gap-3 rounded-2xl p-4">
      <div className="flex items-center gap-1">
        <h2 id="judul-kunci-prioritas" className="mr-auto font-heading leading-tight font-bold">
          {tp("title", { year: priority.year })}
        </h2>
        <button
          type="button"
          onClick={onShowTable}
          aria-label={t("showTable")}
          className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full px-3 text-sm font-bold hover:bg-surface-hover"
        >
          <Icon icon={IconList} className="size-4.5" />
          {t("table")}
        </button>
        <button
          type="button"
          aria-expanded={open}
          aria-controls="catatan-prioritas"
          aria-label={t("notes")}
          onClick={() => setOpen(!open)}
          className="-mr-1 grid size-11 shrink-0 place-items-center rounded-full hover:bg-surface-hover"
        >
          <Icon icon={IconChevronRight} className={`size-5 transition-transform duration-200 ${open ? "-rotate-90" : "rotate-90"}`} />
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
      <div id="catatan-prioritas" hidden={!open} className="flex flex-col gap-3">
        <p className="text-sm text-text-secondary">{priority.caveat}</p>
        <p className="text-sm text-text-secondary">
          {t("source", { publisher: priority.source.publisher })}
          {attribution && ` ${t("boundaries", { attribution })}`}
        </p>
        <Link href="/laporkan/bantu-memetakan" className="inline-flex min-h-11 items-center gap-1.5 self-start text-sm font-bold text-text-brand underline underline-offset-2">
          {tb("link")}
          <Icon icon={IconArrowRight} className="size-4" />
        </Link>
      </div>
    </section>
  );
}
