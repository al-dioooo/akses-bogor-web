"use client";

import { useFormatter, useTranslations } from "next-intl";
import type { DisabilityCounts } from "@/lib/api";
import { Icon } from "@/ui/icon";
import { IconInfoCircle } from "@/ui/icons";
import { Swatch } from "../map-key";
import { BoundariesCredit } from "../priority-legend";
import { RAMP, classOf, classRanges, countsFor, type DisabilityFilter } from "./disabilitas";

const linkClass = "font-semibold text-text-brand underline underline-offset-2";

/**
 * Tabel lapisan Persebaran disabilitas di panel daftar (ADR-0053): data yang sama dengan warna di peta untuk filter di
 * kunci, urut dari yang terbanyak, dengan kelas warnanya sebagai rentang angka, kalimat batas data, dan sumbernya.
 */
export function DisabilityTable({ data, filter, width, max, attribution }: { data: DisabilityCounts; filter: DisabilityFilter; width: number; max: number; attribution: string | null }) {
  const t = useTranslations("Peta.disabilitas");
  const format = useFormatter();
  const rows = countsFor(data, filter).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "id"));
  const ranges = classRanges(width, max);
  const jenis = t(`jenis.${filter.category}`);
  const total = rows.reduce((sum, row) => sum + row.count, 0);

  return (
    <section id="tabel-disabilitas" tabIndex={-1} aria-labelledby="judul-tabel-disabilitas" className="flex scroll-mt-4 flex-col gap-3 border-t border-border-subtle pt-5">
      <h3 id="judul-tabel-disabilitas" className="font-heading text-xl font-bold">
        {t("title", { year: filter.year })}
      </h3>
      <p className="text-text-secondary">{t("intro", { jenis, year: filter.year })}</p>
      {/* Tabel lebar bisa digeser di layar sempit; wilayahnya bisa difokus supaya bisa digeser dengan keyboard (WCAG 2.1.1). */}
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- wilayah gulir harus bisa difokus keyboard. */}
      <div role="region" aria-label={t("region")} tabIndex={0} className="overflow-x-auto rounded-2xl border border-border-subtle">
        <table className="w-full min-w-[18rem] border-collapse text-left text-sm">
          <caption className="sr-only">{t("caption", { jenis, year: filter.year })}</caption>
          <thead className="bg-bg-sunken">
            <tr>
              {(["district", "registered", "class"] as const).map((column) => (
                <th key={column} scope="col" className="px-3 py-2 font-semibold">
                  {t(column)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const range = ranges[classOf(row.count, width)]!;
              return (
                <tr key={row.slug} className="border-t border-border-subtle">
                  <th scope="row" className="px-3 py-2 font-semibold">
                    {row.name}
                  </th>
                  <td className="px-3 py-2 tabular-nums">{format.number(row.count)}</td>
                  <td className="px-3 py-2 tabular-nums">
                    <span className="inline-flex items-center gap-2">
                      <Swatch color={RAMP[classOf(row.count, width)]!} />
                      {t("range", { from: format.number(range.from), to: format.number(range.to) })}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-border-strong">
              <th scope="row" className="px-3 py-2 font-semibold">
                {t("total")}
              </th>
              <td className="px-3 py-2 font-semibold tabular-nums">{format.number(total)}</td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
      <p className="flex gap-2 rounded-2xl bg-status-partial-bg p-3 text-sm text-text-primary">
        <Icon icon={IconInfoCircle} className="mt-0.5 size-4 shrink-0" />
        {data.caveat}
      </p>
      <p className="text-sm text-text-secondary">
        {t.rich("sourceFull", {
          year: filter.year,
          title: data.source.title,
          date: format.dateTime(new Date(data.source.retrievedAt), { dateStyle: "long" }),
          terms: data.source.terms,
          link: (chunks) => (
            <a href={data.source.url} target="_blank" rel="noopener noreferrer" className={linkClass}>
              {chunks} {t("newTab")}
            </a>
          ),
        })}
      </p>
      {attribution && (
        <p className="text-sm text-text-secondary">
          <BoundariesCredit attribution={attribution} />
        </p>
      )}
    </section>
  );
}
