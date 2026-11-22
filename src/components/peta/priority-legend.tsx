"use client";

import { useTranslations } from "next-intl";
import type { DistrictPriority } from "@/lib/api";
import { PriorityTable } from "@/components/prioritas/priority-table";

/**
 * Tabel lapisan prioritas kecamatan di panel daftar Peta (ADR-0043): data yang sama dengan lapisan peta, dengan tingkat
 * sebagai teks, untuk yang tidak bisa melihat atau memakai peta. Kunci warnanya mengambang di atas peta (PriorityKey).
 */
export function PriorityLegend({ priority, attribution }: { priority: DistrictPriority; attribution: string | null }) {
  const t = useTranslations("Peta.prioritas");
  return (
    <div id="tabel-prioritas" tabIndex={-1} className="flex scroll-mt-4 flex-col gap-4 border-t border-border-subtle pt-5">
      <PriorityTable data={priority}>
        <p className="text-text-secondary">{t("intro")}</p>
        {attribution && <p className="text-sm text-text-secondary">{t("boundaries", { attribution })}</p>}
      </PriorityTable>
    </div>
  );
}
