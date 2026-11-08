import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import type { Facility } from "@/lib/api";
import type { FacilityValue, Review } from "@/lib/verifikasi";
import { Icon } from "@/ui/icon";
import { FACILITY_ICON } from "@/ui/place-icons";
import { AnswerChip, ChangeMark } from "./parts";

const same = (a?: FacilityValue, b?: FacilityValue) => a?.answer === b?.answer && (a?.reason ?? null) === (b?.reason ?? null) && (a?.note ?? null) === (b?.note ?? null);

/**
 * Satu kartu per fasilitas (FR-31, FR-33): data saat ini dan jawaban pelapor berdampingan. `decision` adalah tempat
 * kontrol keputusan per jawaban di halaman pemeriksaan.
 */
export function FacilityCompare({ review, decision }: { review: Review; decision?: (facility: Facility) => ReactNode }) {
  const t = useTranslations("Pemeriksaan.compare");
  const tf = useTranslations("Fasilitas");
  return (
    <ol className="flex flex-col gap-4">
      {review.submission.facilities.map((reported) => {
        const current = review.place?.facilities.find((f) => f.facility === reported.facility);
        return (
          <li key={reported.facility}>
            <section aria-labelledby={`fasilitas-${reported.facility}`} className="flex flex-col gap-4 rounded-3xl border-2 border-border-subtle bg-surface-raised p-4 sm:p-5">
              <h3 id={`fasilitas-${reported.facility}`} className="flex items-center gap-3 font-heading text-xl font-bold">
                <span className="grid size-10 place-items-center rounded-xl bg-bg-sunken text-icon-brand">
                  <Icon icon={FACILITY_ICON[reported.facility]} className="size-5.5" />
                </span>
                {tf(reported.facility)}
              </h3>
              <dl className={`grid gap-3 ${current ? "sm:grid-cols-2" : ""}`}>
                {current && (
                  <div className="flex flex-col gap-2 rounded-2xl bg-bg-sunken p-3">
                    <dt className="lbl text-text-secondary">{t("current")}</dt>
                    <dd>
                      <AnswerChip {...current} />
                    </dd>
                  </div>
                )}
                <div className="flex flex-col gap-2 rounded-2xl bg-bg-sunken p-3">
                  <dt className="lbl flex items-center gap-2 text-text-secondary">
                    {t("reported")}
                    {current && <ChangeMark changed={!same(current, reported)} />}
                  </dt>
                  <dd>
                    <AnswerChip {...reported} />
                  </dd>
                </div>
              </dl>
              {decision?.(reported.facility)}
            </section>
          </li>
        );
      })}
    </ol>
  );
}
