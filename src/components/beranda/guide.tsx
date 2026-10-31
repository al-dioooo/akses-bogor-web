import { getTranslations } from "next-intl/server";
import { FACILITIES, STATUSES } from "@/lib/api";
import { Icon } from "@/ui/icon";
import { FACILITY_ICON } from "@/ui/place-icons";
import { SectionHeading } from "@/ui/section-heading";
import { StatusBadge } from "@/ui/status-badge";

/** Edukasi singkat: empat fasilitas (ADR-0017) dan arti keempat status (ADR-0018). */
export async function Guide() {
  const [t, tf] = await Promise.all([getTranslations("Beranda.guide"), getTranslations("Fasilitas")]);
  return (
    <section aria-labelledby="judul-panduan" className="page-width flex flex-col gap-8">
      <SectionHeading id="judul-panduan" label={t("eyebrow")} title={t("title")} intro={t("intro")} />
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="reveal panel rounded-2xl p-5 sm:p-7">
          <h3 className="font-heading text-lg font-bold tracking-[-0.02em]">{t("facilitiesTitle")}</h3>
          <ul className="mt-4 flex flex-col gap-4">
            {FACILITIES.map((facility) => (
              <li key={facility} className="flex gap-4">
                <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-surface-brand-subtle text-icon-brand">
                  <Icon icon={FACILITY_ICON[facility]} className="size-5.5" />
                </span>
                <span>
                  <span className="block font-semibold">{tf(facility)}</span>
                  <span className="text-text-secondary">{t(`facility.${facility}`)}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div className="reveal panel rounded-2xl p-5 sm:p-7">
          <h3 className="font-heading text-lg font-bold tracking-[-0.02em]">{t("statusesTitle")}</h3>
          <dl className="mt-4 flex flex-col gap-4">
            {STATUSES.map((status) => (
              <div key={status} className="flex flex-col items-start gap-1.5">
                <dt>
                  <StatusBadge status={status} size="sm" />
                </dt>
                <dd className="text-text-secondary">{t(`status.${status}`)}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}
