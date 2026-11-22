"use client";

import { useFormatter, useTranslations } from "next-intl";
import { useId, type ReactNode } from "react";
import type { DistrictPriority } from "@/lib/agen-rute";
import { Icon } from "@/ui/icon";
import { IconInfoCircle } from "@/ui/icons";
import { LEVEL_COLOR } from "./levels";

const linkClass = "font-semibold text-text-brand underline underline-offset-2";

/**
 * Tabel prioritas kecamatan dari data penyandang disabilitas terdaftar (ADR-0043): urut peringkat, dengan tingkat
 * sebagai teks dan warna, catatan batas datanya, dan kredit sumber. Dipakai di kartu agen dan sebagai pengganti lapisan
 * peta di halaman Peta.
 */
export function PriorityTable({ data, headingLevel = 3, children }: { data: DistrictPriority; headingLevel?: 2 | 3; /** Isi di antara judul dan tabel, mis. legenda peta. */ children?: ReactNode }) {
  const t = useTranslations("PrioritasKecamatan");
  const format = useFormatter();
  const titleId = useId();
  const Heading = headingLevel === 2 ? "h2" : "h3";
  const rows = [...data.districts].sort((a, b) => a.rank - b.rank);

  return (
    <section aria-labelledby={titleId} className="flex w-full min-w-0 flex-col gap-3">
      <Heading id={titleId} className="font-heading text-xl font-bold">
        {t("title", { year: data.year })}
      </Heading>
      {children}
      {/* Tabel lebar bisa digeser di layar sempit; wilayahnya bisa difokus supaya bisa digeser dengan keyboard (WCAG 2.1.1). */}
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- wilayah gulir harus bisa difokus keyboard. */}
      <div role="region" aria-label={t("region")} tabIndex={0} className="overflow-x-auto rounded-2xl border border-border-subtle">
        <table className="w-full min-w-[36rem] border-collapse text-left text-sm">
          <caption className="sr-only">{t("caption", { year: data.year })}</caption>
          <thead className="bg-bg-sunken">
            <tr>
              {(["rank", "district", "level", "score", "registered", "withoutData", "verified"] as const).map((column) => (
                <th key={column} scope="col" className="px-3 py-2 font-semibold">
                  {t(column)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.slug} className="border-t border-border-subtle">
                <td className="px-3 py-2 tabular-nums">{row.rank}</td>
                <th scope="row" className="px-3 py-2 font-semibold">
                  {row.name}
                </th>
                <td className="px-3 py-2">
                  <span className="inline-flex items-center gap-2">
                    <span aria-hidden="true" className="size-4 shrink-0 rounded-sm border border-border-strong" style={{ background: `var(${LEVEL_COLOR[row.level]})` }} />
                    {t(`tingkat.${row.level}`)}
                  </span>
                </td>
                <td className="px-3 py-2 tabular-nums">{format.number(row.score)}</td>
                <td className="px-3 py-2 tabular-nums">{format.number(row.registered)}</td>
                <td className="px-3 py-2 tabular-nums">{format.number(row.facilitiesWithoutData)}</td>
                <td className="px-3 py-2 tabular-nums">{format.number(row.verifiedPlaces)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="flex gap-2 rounded-2xl bg-status-partial-bg p-3 text-sm text-text-primary">
        <Icon icon={IconInfoCircle} className="mt-0.5 size-4 shrink-0" />
        {data.caveat}
      </p>
      {data.formula && <p className="text-sm text-text-secondary">{t("formula", { formula: data.formula })}</p>}
      <p className="text-sm text-text-secondary">
        {t.rich("source", {
          title: data.source.title,
          publisher: data.source.publisher,
          date: format.dateTime(new Date(data.source.retrievedAt), { dateStyle: "long" }),
          terms: data.source.terms,
          link: (chunks) => (
            <a href={data.source.url} target="_blank" rel="noopener noreferrer" className={linkClass}>
              {chunks}
            </a>
          ),
        })}
      </p>
      {data.facilitiesSource && (
        <p className="text-sm text-text-secondary">
          {data.facilitiesSource.retrievedAt
            ? t("facilitiesDated", { attribution: data.facilitiesSource.attribution, date: format.dateTime(new Date(data.facilitiesSource.retrievedAt), { dateStyle: "long" }) })
            : t("facilities", { attribution: data.facilitiesSource.attribution })}
        </p>
      )}
    </section>
  );
}
