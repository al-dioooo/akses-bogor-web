"use client";

import { useTranslations } from "next-intl";
import type { DistrictPriority } from "@/lib/api";
import { LEVEL_COLOR, LEVELS } from "@/components/prioritas/levels";
import { PriorityTable } from "@/components/prioritas/priority-table";

/**
 * Legenda dan tabel lapisan prioritas kecamatan di Peta (ADR-0043). Setiap tingkat ditulis sebagai teks di samping
 * warnanya, dan tabel berisi data yang sama dengan lapisan peta untuk yang tidak bisa melihat atau memakai peta.
 */
export function PriorityLegend({ priority, attribution }: { priority: DistrictPriority; attribution: string | null }) {
  const t = useTranslations("Peta.prioritas");
  const tl = useTranslations("PrioritasKecamatan.tingkat");
  return (
    <div className="panel flex flex-col gap-4 rounded-3xl p-5 sm:p-6">
      <PriorityTable data={priority} headingLevel={2}>
        <p className="text-text-secondary">{t("intro")}</p>
        <div className="flex flex-col gap-2">
          <p id="legenda-prioritas" className="text-sm font-semibold">
            {t("legend")}
          </p>
          <ul aria-labelledby="legenda-prioritas" className="flex flex-wrap gap-x-5 gap-y-2">
            {LEVELS.map((level) => (
              <li key={level} className="inline-flex items-center gap-2 text-sm">
                <span aria-hidden="true" className="size-5 shrink-0 rounded-md border border-border-strong" style={{ background: `var(${LEVEL_COLOR[level]})` }} />
                {tl(level)}
              </li>
            ))}
          </ul>
          {attribution && <p className="text-sm text-text-secondary">{t("boundaries", { attribution })}</p>}
        </div>
      </PriorityTable>
    </div>
  );
}
