"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import type { DistrictPriority } from "@/lib/api";
import { LEVEL_COLOR, LEVELS } from "@/components/prioritas/levels";
import { Icon } from "@/ui/icon";
import { IconArrowRight } from "@/ui/icons";
import { MapKey, Swatch } from "./map-key";
import { BoundariesCredit } from "./priority-legend";

/**
 * Kunci lapisan Prioritas pemetaan (ADR-0043, ADR-0053): empat tingkat sebagai teks di samping warnanya, catatan batas
 * data dan sumbernya (selalu ikut bersama warna dari angka Dinsos), tombol ke tabel di panel daftar, dan jalan ke Bantu
 * memetakan. Di ponsel baris ringkasnya skala warna dari rendah ke sangat tinggi.
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
  const tb = useTranslations("Agen.entry");

  return (
    <MapKey
      name="prioritas"
      title={tp("title", { year: priority.year })}
      compact={compact}
      // Pesan galat batas kecamatan selalu tampil, juga di ponsel.
      open={failed}
      onShowTable={onShowTable}
      summary={
        <>
          <span className="flex shrink-0 gap-0.5">
            {LEVELS.map((level) => (
              <Swatch key={level} color={LEVEL_COLOR[level]} className="size-3.5" />
            ))}
          </span>
          <span className="truncate">{t("keyShort", { year: priority.year })}</span>
        </>
      }
    >
      {failed ? (
        <p role="alert" className="rounded-xl bg-status-partial-bg p-3 text-sm text-text-primary">
          {t("failed")}
        </p>
      ) : (
        <ul aria-label={t("legend")} className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-sm">
          {LEVELS.map((level) => (
            <li key={level} className="inline-flex items-center gap-2">
              <Swatch color={LEVEL_COLOR[level]} />
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
      <Link href="/agen" className="inline-flex min-h-11 items-center gap-1.5 self-start text-sm font-bold text-text-brand underline underline-offset-2">
        {tb("link")}
        <Icon icon={IconArrowRight} className="size-4" />
      </Link>
    </MapKey>
  );
}
