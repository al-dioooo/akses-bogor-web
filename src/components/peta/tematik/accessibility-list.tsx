"use client";

import { useFormatter, useTranslations } from "next-intl";
import type { DistrictAccessibility } from "@/lib/api";
import { Icon } from "@/ui/icon";
import { IconInfoCircle } from "@/ui/icons";
import { Swatch } from "../map-key";
import { HatchSwatch, Sources, UncheckedBadge } from "./accessibility-key";
import { ranked, scoreClass, unverified } from "./aksesibel";
import { RAMP } from "./disabilitas";

type District = DistrictAccessibility["districts"][number];

/**
 * Daftar peringkat lapisan Kecamatan paling aksesibel di panel daftar (ADR-0053), di samping peta dan sebagai
 * alternatifnya: setiap skor dengan cakupan datanya dan berapa yang belum diperiksa tim beserta sumbernya, lalu
 * kecamatan yang datanya belum cukup tanpa peringkat.
 */
export function AccessibilityList({ data, attribution }: { data: DistrictAccessibility; attribution: string | null }) {
  const t = useTranslations("Peta.aksesibel");
  const { withRank, without } = ranked(data);
  const google = data.sources.google_maps !== null;

  return (
    <section id="daftar-aksesibel" tabIndex={-1} aria-labelledby="judul-daftar-aksesibel" className="flex scroll-mt-4 flex-col gap-3 border-t border-border-subtle pt-5">
      <h3 id="judul-daftar-aksesibel" className="font-heading text-xl font-bold">
        {t("title")}
        {withRank.some((d) => unverified(d) > 0) || without.some((d) => unverified(d) > 0) ? (
          <>
            {" "}
            <UncheckedBadge />
          </>
        ) : null}
      </h3>
      <p className="text-text-secondary">{t("listIntro")}</p>
      {withRank.length > 0 ? (
        <ol aria-label={t("rankedLabel")} className="flex flex-col gap-2">
          {withRank.map((district) => (
            <li key={district.slug} className="flex gap-3 rounded-2xl border border-border-subtle p-3">
              <span className="font-heading text-lg font-bold tabular-nums" aria-hidden="true">
                {district.rank}
              </span>
              <div className="flex min-w-0 flex-col gap-1 text-sm">
                <p className="flex flex-wrap items-center gap-x-2 text-base font-semibold">
                  <span className="sr-only">{t("rankLabel", { rank: district.rank! })} </span>
                  {district.name}
                  <span className="inline-flex items-center gap-1.5 tabular-nums">
                    <Swatch color={RAMP[scoreClass(district.score!)]!} />
                    {t("score", { score: district.score! })}
                  </span>
                </p>
                <Details district={district} google={google} />
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <p className="rounded-2xl bg-bg-sunken p-4 text-text-secondary">{t("noneRanked", { minimum: data.minimumPlaces })}</p>
      )}
      {without.length > 0 && (
        <>
          <h4 className="flex items-center gap-2 font-semibold">
            <HatchSwatch />
            {t("notEnoughTitle")}
          </h4>
          <ul className="flex flex-col gap-2 text-sm">
            {without.map((district) => (
              <li key={district.slug} className="flex flex-col gap-1 rounded-2xl bg-bg-sunken p-3">
                <p className="text-base font-semibold">{district.name}</p>
                <p className="text-text-secondary">{t("notEnoughItem", { withData: district.withData, places: district.places, minimum: data.minimumPlaces })}</p>
                {district.withData > 0 && <SourceLine district={district} google={google} />}
              </li>
            ))}
          </ul>
        </>
      )}
      <p className="flex gap-2 rounded-2xl bg-status-partial-bg p-3 text-sm text-text-primary">
        <Icon icon={IconInfoCircle} className="mt-0.5 size-4 shrink-0" />
        {data.caveat}
      </p>
      <p className="text-sm text-text-secondary">{t("formula", { formula: data.formula })}</p>
      <Sources data={data} attribution={attribution} />
    </section>
  );
}

/** Rincian satu kecamatan: berapa yang bisa dimasuki, cakupan, dan asal keterangannya. */
function Details({ district, google }: { district: District; google: boolean }) {
  const t = useTranslations("Peta.aksesibel");
  const format = useFormatter();
  return (
    <>
      <p>
        {t("accessibleOf", { accessible: district.accessible, withData: district.withData })}
        {district.limited > 0 && ` · ${t("limited", { count: district.limited })}`}
      </p>
      <p className="text-text-secondary">{t("districtCoverage", { withData: format.number(district.withData), places: format.number(district.places) })}</p>
      <SourceLine district={district} google={google} />
    </>
  );
}

/** Asal keterangan satu kecamatan: data AksesBogor dan yang belum diperiksa tim, per sumber. */
function SourceLine({ district, google }: { district: District; google: boolean }) {
  const t = useTranslations("Peta.aksesibel");
  const values = { team: district.bySource.aksesbogor.withData, unverified: unverified(district), osm: district.bySource.openstreetmap.withData, google: district.bySource.google_maps.withData };
  return <p className="text-text-secondary">{google ? t("districtSources", values) : t("districtSourcesOsm", values)}</p>;
}
