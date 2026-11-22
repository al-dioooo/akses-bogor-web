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
        {attribution && (
          <p className="text-sm text-text-secondary">
            <BoundariesCredit attribution={attribution} />
          </p>
        )}
      </PriorityTable>
    </div>
  );
}

/**
 * Kredit batas kecamatan dari API (ADR-0034). Atribusi OpenStreetMap menaut ke halaman hak cipta dan lisensinya, sesuai
 * syarat ODbL, di tab baru (disebut di teks tautannya).
 */
export function BoundariesCredit({ attribution }: { attribution: string }) {
  const t = useTranslations("Peta.prioritas");
  return t.rich("boundaries", {
    attribution,
    credit: (chunks) =>
      attribution.includes("OpenStreetMap") ? (
        <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" className="font-semibold text-text-brand underline underline-offset-2">
          {chunks} {t("newTab")}
        </a>
      ) : (
        chunks
      ),
  });
}
