"use client";

import { useFormatter, useTranslations } from "next-intl";
import { useId } from "react";
import type { AccessibleRoute } from "@/lib/rute-aksesibel";
import { Icon } from "@/ui/icon";
import { IconAlertTriangle, IconInfoCircle } from "@/ui/icons";

/** Peringatan yang isinya sudah tampil di daftar kelengkapan data, jadi tidak diulang di daftar peringatan. */
const SHOWN_AS_COVERAGE = new Set(["data_trotoar_kurang", "data_permukaan_kurang", "data_kerb_kurang"]);

/**
 * Label tetap, kelengkapan data OpenStreetMap, dan peringatan untuk rute dari Valhalla (ADR-0055). Kalimat label dan
 * peringatan datang dari API, seperti kalimat peringatan rute Mapbox.
 */
export function RouteCoverage({ route }: { route: AccessibleRoute }) {
  const t = useTranslations("RuteJalanKaki.cakupan");
  const format = useFormatter();
  const coverageId = useId();
  const warningsId = useId();
  const { coverage } = route;
  const warnings = route.warnings.filter((warning) => !SHOWN_AS_COVERAGE.has(warning.code));
  const known = coverage.sidewalkPercent !== null && coverage.surfacePercent !== null && coverage.crossings !== null && coverage.crossingsWithKerb !== null;

  return (
    <>
      <div className="flex gap-3 rounded-2xl border-2 border-border-subtle bg-bg-sunken p-4 text-text-primary">
        <Icon icon={IconInfoCircle} className="mt-0.5 size-6 shrink-0 text-icon-brand" />
        <p className="font-semibold">{route.note}</p>
      </div>

      <section aria-labelledby={coverageId} className="flex flex-col gap-2">
        <h4 id={coverageId} className="font-heading text-lg font-bold">
          {t("title")}
        </h4>
        {known ? (
          <ul className="flex list-disc flex-col gap-1 pl-6">
            <li>{t("sidewalk", { percent: coverage.sidewalkPercent! })}</li>
            <li>{t("surface", { percent: coverage.surfacePercent! })}</li>
            <li>{coverage.crossings === 0 ? t("noCrossings") : t("kerb", { withKerb: coverage.crossingsWithKerb!, crossings: coverage.crossings! })}</li>
          </ul>
        ) : (
          <p>{t("unknown")}</p>
        )}
        {coverage.dataDate && (
          <p className="text-sm text-text-secondary">
            {t("dataDate", { date: format.dateTime(new Date(`${coverage.dataDate}T12:00:00Z`), { day: "numeric", month: "long", year: "numeric" }) })}
          </p>
        )}
      </section>

      {warnings.length > 0 && (
        <section aria-labelledby={warningsId} className="flex flex-col gap-2 rounded-2xl border-2 border-status-partial-fg bg-status-partial-bg p-4 text-text-primary">
          <h4 id={warningsId} className="flex items-center gap-2 font-heading text-lg font-bold">
            <Icon icon={IconAlertTriangle} className="size-6 shrink-0 text-status-partial-fg" />
            {t("warningsTitle")}
          </h4>
          <ul className="flex list-disc flex-col gap-1 pl-6">
            {warnings.map((warning) => (
              <li key={warning.code}>{warning.message}</li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
