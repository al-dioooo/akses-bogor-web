import { getTranslations } from "next-intl/server";
import { STATUSES } from "@/lib/api";
import { STATUS_TONE } from "@/ui/place-icons";
import { StatusBadge } from "@/ui/status-badge";

/** Arti keempat status (ADR-0018): tempat rute berakhir, di pintu masuk. */
export async function Statuses() {
  const t = await getTranslations("Beranda.guide");
  return (
    <section aria-labelledby="judul-status" className="page-width">
      <div className="reveal grid gap-10 rounded-[2rem] border border-border-subtle bg-surface-raised p-6 sm:p-10 lg:grid-cols-[1fr_2fr]">
        <div className="flex flex-col items-start gap-4">
          <p className="lbl">{t("statusesEyebrow")}</p>
          <h2 id="judul-status" className="display text-[clamp(2rem,1.3rem+2vw,3rem)] leading-[1.02]">
            {t("statusesTitle")} <span className="accent">{t("statusesAccent")}</span>
          </h2>
        </div>
        <dl className="grid gap-3 sm:grid-cols-2">
          {STATUSES.map((status) => (
            <div key={status} className={`flex flex-col items-start gap-3 rounded-[1.25rem] p-5 ${STATUS_TONE[status]}`}>
              <dt>
                <StatusBadge status={status} size="sm" raised />
              </dt>
              <dd className="text-text-secondary">{t(`status.${status}`)}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
