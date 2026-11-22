import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { LEVEL_COLOR } from "@/components/prioritas/levels";
import { getDistrictPriority } from "@/lib/api";
import { buttonClass } from "@/ui/button-styles";
import { Icon } from "@/ui/icon";
import { IconCirclePlus, IconMap2, IconRoute } from "@/ui/icons";
import { SectionTitle } from "./section";

const SHOWN = 3;

/**
 * Petakan berikutnya (ADR-0046): tiga kecamatan dengan prioritas tertinggi dari `GET /districts/priority` (ADR-0043),
 * selalu dengan kalimat batas data dan sumbernya. Selama API belum membuka data itu (503), bagian ini hanya mengajak
 * melapor. Jalan ke agen hanya muncul selama API membuka agen.
 */
export async function NextPlace({ agent }: { agent: boolean }) {
  const [t, levels, priority] = await Promise.all([getTranslations("Dasbor.ringkasan.petakan"), getTranslations("PrioritasKecamatan.tingkat"), getDistrictPriority()]);
  const top = priority ? [...priority.districts].sort((a, b) => a.rank - b.rank).slice(0, SHOWN) : [];
  return (
    <section aria-labelledby="ringkasan-petakan" className="flex flex-col gap-4">
      <SectionTitle id="ringkasan-petakan" title={t("title")} />
      <div className="panel flex flex-col gap-4 rounded-3xl p-5">
        {priority ? (
          <>
            <p className="text-text-secondary">{t("intro", { year: priority.year })}</p>
            <ol className="flex flex-col gap-3">
              {top.map((district) => (
                <li key={district.slug} className="flex items-start gap-3">
                  <span aria-hidden="true" className="pt-0.5 font-mono text-sm font-semibold text-text-brand">
                    {String(district.rank).padStart(2, "0")}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="font-heading font-bold">{district.name}</span>
                    <span className="inline-flex items-center gap-1.5 text-sm font-semibold">
                      <span aria-hidden="true" className="size-3 shrink-0 rounded-full border border-border-strong" style={{ backgroundColor: `var(${LEVEL_COLOR[district.level]})` }} />
                      {t("level", { level: levels(district.level).toLocaleLowerCase("id-ID") })}
                    </span>
                    <span className="text-sm text-text-secondary">{t("withoutData", { count: district.facilitiesWithoutData })}</span>
                  </span>
                </li>
              ))}
            </ol>
            <p className="text-sm text-text-secondary">{priority.caveat}</p>
            <p className="text-sm text-text-secondary">
              {priority.facilitiesSource
                ? t("source", { publisher: priority.source.publisher, osm: priority.facilitiesSource.attribution })
                : t("sourceDinsos", { publisher: priority.source.publisher })}
            </p>
          </>
        ) : (
          <p>{t("fallback")}</p>
        )}
        <div className="flex flex-wrap gap-2">
          {agent ? (
            <Link href="/laporkan/bantu-memetakan" className={buttonClass("primary", "sm")}>
              <Icon icon={IconRoute} />
              {t("agent")}
            </Link>
          ) : (
            <Link href="/laporkan" className={buttonClass("primary", "sm")}>
              <Icon icon={IconCirclePlus} />
              {t("report")}
            </Link>
          )}
          {priority && (
            <Link href="/peta" className={buttonClass("outline", "sm")}>
              <Icon icon={IconMap2} />
              {t("map")}
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
