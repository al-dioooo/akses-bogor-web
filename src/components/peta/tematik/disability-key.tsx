"use client";

import { useFormatter, useTranslations } from "next-intl";
import { useId } from "react";
import type { DisabilityCounts } from "@/lib/api";
import { MapKey, Swatch } from "../map-key";
import { BoundariesCredit } from "../priority-legend";
import { RAMP, classRanges, type DisabilityFilter } from "./disabilitas";

const selectClass =
  "min-h-11 w-full rounded-xl border-2 border-border-field bg-surface-field px-3 text-sm font-semibold text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring";

/**
 * Kunci lapisan Persebaran disabilitas (ADR-0053): filter jenis dan tahun, rentang angka setiap kelas warna, kalimat
 * batas data, dan sumbernya. Warna dan tabel di panel mengikuti filter ini.
 */
export function DisabilityKey({
  data,
  filter,
  onFilter,
  width,
  max,
  boundariesFailed,
  attribution,
  compact,
  onShowTable,
}: {
  data: DisabilityCounts;
  filter: DisabilityFilter;
  onFilter: (filter: DisabilityFilter) => void;
  /** Lebar satu kelas warna untuk pilihan ini, dan angka terbesarnya. */
  width: number;
  max: number;
  /** Batas kecamatan gagal dimuat: warna tidak tampil di peta, tetapi tabel tetap ada. */
  boundariesFailed: boolean;
  attribution: string | null;
  compact: boolean;
  onShowTable: () => void;
}) {
  const t = useTranslations("Peta.disabilitas");
  const format = useFormatter();
  const id = useId();

  return (
    <MapKey
      name="disabilitas"
      title={t("title", { year: filter.year })}
      compact={compact}
      open={boundariesFailed}
      onShowTable={onShowTable}
      summary={
        <>
          <span className="flex shrink-0 gap-0.5">
            {RAMP.map((color) => (
              <Swatch key={color} color={color} className="size-3.5" />
            ))}
          </span>
          <span className="truncate">{t("keyShort", { year: filter.year, jenis: t(`jenisShort.${filter.category}`) })}</span>
        </>
      }
    >
      {boundariesFailed && (
        <p role="alert" className="rounded-xl bg-status-partial-bg p-3 text-sm text-text-primary">
          {t("boundariesFailed")}
        </p>
      )}
      <div className="grid grid-cols-[minmax(0,1fr)_6.5rem] gap-2">
        <label htmlFor={`${id}-jenis`} className="flex flex-col gap-1 text-sm font-semibold">
          {t("category")}
          <select
            id={`${id}-jenis`}
            value={filter.category}
            onChange={(event) => onFilter({ ...filter, category: event.target.value as DisabilityFilter["category"] })}
            className={selectClass}
          >
            {(["semua", ...data.categories] as const).map((category) => (
              <option key={category} value={category}>
                {t(`jenis.${category}`)}
              </option>
            ))}
          </select>
        </label>
        <label htmlFor={`${id}-tahun`} className="flex flex-col gap-1 text-sm font-semibold">
          {t("year")}
          <select id={`${id}-tahun`} value={filter.year} onChange={(event) => onFilter({ ...filter, year: Number(event.target.value) })} className={selectClass}>
            {[...data.years].reverse().map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </label>
      </div>
      <ul aria-label={t("legend")} className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-sm tabular-nums">
        {classRanges(width, max).map(({ from, to }, i) => (
          <li key={RAMP[i]} className="inline-flex items-center gap-2">
            <Swatch color={RAMP[i]!} />
            {t("range", { from: format.number(from), to: format.number(to) })}
          </li>
        ))}
      </ul>
      <p className="text-sm text-text-secondary">
        <span className="font-bold text-text-primary">{t("caveatLabel")} </span>
        {data.caveat}
      </p>
      <p className="text-sm text-text-secondary">
        {t("source", { year: filter.year })}
        {attribution && (
          <>
            {" "}
            <BoundariesCredit attribution={attribution} />
          </>
        )}
      </p>
    </MapKey>
  );
}
