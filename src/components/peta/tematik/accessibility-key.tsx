"use client";

import { useFormatter, useTranslations } from "next-intl";
import type { DistrictAccessibility } from "@/lib/api";
import { MapKey, Swatch } from "../map-key";
import { BoundariesCredit } from "../priority-legend";
import { SCORE_RANGES, cityTotals } from "./aksesibel";
import { RAMP } from "./disabilitas";

/** Arsiran yang sama dengan kecamatan "Data belum cukup" di peta. */
export function HatchSwatch({ className = "size-4" }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`shrink-0 rounded-sm border border-border-strong ${className}`}
      style={{ background: "repeating-linear-gradient(135deg, var(--color-text-secondary) 0 1.5px, transparent 1.5px 5px)" }}
    />
  );
}

/** Label "belum diperiksa tim" yang selalu menemani skor selama ada keterangan pihak ketiga (ADR-0053). */
export function UncheckedBadge() {
  const t = useTranslations("Peta.aksesibel");
  return <span className="inline-block rounded-full border border-border-strong px-2 align-middle text-xs font-bold whitespace-nowrap">{t("unchecked")}</span>;
}

/**
 * Kunci lapisan Kecamatan paling aksesibel (ADR-0053): ukurannya dalam satu kalimat, kelas persentase dan arsiran "Data
 * belum cukup", cakupan data dan berapa yang belum diperiksa tim, catatan, dan setiap sumber dengan atribusinya.
 */
export function AccessibilityKey({
  data,
  boundariesFailed,
  attribution,
  compact,
  onShowTable,
}: {
  data: DistrictAccessibility;
  boundariesFailed: boolean;
  attribution: string | null;
  compact: boolean;
  onShowTable: () => void;
}) {
  const t = useTranslations("Peta.aksesibel");
  const format = useFormatter();
  const totals = cityTotals(data);
  const unchecked = totals.unverified > 0;

  return (
    <MapKey
      name="aksesibel"
      title={
        <>
          {t("title")}
          {unchecked && (
            <>
              {" "}
              <UncheckedBadge />
            </>
          )}
        </>
      }
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
          <span className="flex min-w-0 flex-col leading-tight">
            <span className="truncate">{t("keyShort")}</span>
            {unchecked && <span className="truncate text-xs font-semibold text-text-secondary">{t("unchecked")}</span>}
          </span>
        </>
      }
    >
      {boundariesFailed && (
        <p role="alert" className="rounded-xl bg-status-partial-bg p-3 text-sm text-text-primary">
          {t("boundariesFailed")}
        </p>
      )}
      <p className="text-sm">{t("measure")}</p>
      <ul aria-label={t("legend")} className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-sm tabular-nums">
        {SCORE_RANGES.map(({ from, to }, i) => (
          <li key={from} className="inline-flex items-center gap-2">
            <Swatch color={RAMP[i]!} />
            {t("range", { from, to })}
          </li>
        ))}
        <li className="col-span-2 inline-flex items-center gap-2">
          <HatchSwatch />
          {t("notEnough", { minimum: data.minimumPlaces })}
        </li>
      </ul>
      <p className="text-sm text-text-secondary">
        {t("coverage", { withData: format.number(totals.withData), places: format.number(totals.places) })}{" "}
        {unchecked &&
          (data.sources.google_maps
            ? t("uncheckedCount", { count: totals.unverified, osm: totals.openstreetmap, google: totals.google })
            : t("uncheckedCountOsm", { count: totals.unverified }))}
      </p>
      <p className="text-sm text-text-secondary">
        <span className="font-bold text-text-primary">{t("caveatLabel")} </span>
        {data.caveat}
      </p>
      <Sources data={data} attribution={attribution} />
    </MapKey>
  );
}

/**
 * Setiap sumber dengan labelnya: data AksesBogor (diperiksa tim), OpenStreetMap dengan atribusi ODbL yang menaut ke
 * halaman hak ciptanya, dan salinan Google Maps dengan tanggal pengambilannya bila ikut dihitung.
 */
export function Sources({ data, attribution }: { data: DistrictAccessibility; attribution: string | null }) {
  const t = useTranslations("Peta.aksesibel");
  const format = useFormatter();
  const google = data.sources.google_maps;
  return (
    <p className="text-sm text-text-secondary">
      <span className="font-bold text-text-primary">{t("sourcesLabel")} </span>
      {t("sourceAksesBogor")};{" "}
      {t.rich("sourceOsm", {
        attribution: data.sources.openstreetmap.attribution,
        credit: (chunks) => (
          <a href={data.sources.openstreetmap.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-text-brand underline underline-offset-2">
            {chunks} {t("newTab")}
          </a>
        ),
      })}
      {google &&
        (google.retrievedAt
          ? `; ${t("sourceGoogle", { date: format.dateTime(new Date(`${google.retrievedAt}T00:00:00+07:00`), { dateStyle: "medium", timeZone: "Asia/Jakarta" }) })}`
          : `; ${t("sourceGoogleUndated")}`)}
      .
      {attribution && (
        <>
          {" "}
          <BoundariesCredit attribution={attribution} />
        </>
      )}
    </p>
  );
}
