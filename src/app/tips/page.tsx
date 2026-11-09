import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { EduPage } from "@/components/edukasi/edu-page";
import { Icon } from "@/ui/icon";
import { IconShieldCheck } from "@/ui/icons";
import { PageRow } from "@/ui/page-row";

type Tip = { title: string; body: string };

// Urutan sama dengan tag foto di formulir Laporkan (ADR-0023); "Lainnya" tidak butuh petunjuk khusus.
const SHOTS = ["pintu_masuk", "toilet_difabel", "guiding_block", "lift"] as const;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Tips");
  return { title: t("metaTitle") };
}

/**
 * Tips berkunjung dan melapor (FR-51, ADR-0041): membaca halaman lokasi sebelum berangkat, melapor yang bisa
 * diverifikasi, dan foto tanpa wajah atau pelat nomor. Isinya mengikuti Panduan Verifikasi, ADR-0023, dan ADR-0037.
 */
export default async function Tips() {
  const [t, tl] = await Promise.all([getTranslations("Tips"), getTranslations("Laporkan.foto.tags")]);
  const visit = t.raw("visit.items") as Tip[];
  return (
    <EduPage namespace="Tips">
      <PageRow id="sebelum-berangkat" title={t("visit.title")}>
        <ol className="flex flex-col gap-5">
          {visit.map((tip, index) => (
            <li key={tip.title} className="grid grid-cols-[auto_minmax(0,1fr)] gap-4">
              <span
                aria-hidden="true"
                className="grid size-11 place-items-center rounded-full bg-surface-brand-subtle font-mono text-base font-medium text-text-brand"
              >
                {String(index + 1).padStart(2, "0")}
              </span>
              <div>
                <h3 className="font-heading text-xl font-bold">{tip.title}</h3>
                <p className="text-text-secondary">{tip.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </PageRow>

      <PageRow id="saat-melapor" title={t("report.title")}>
        <ul className="flex list-disc flex-col gap-3 pl-6">
          {(t.raw("report.items") as string[]).map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </PageRow>

      <PageRow id="foto" title={t("photos.title")}>
        <p>{t("photos.intro")}</p>
        <div className="flex flex-col gap-3">
          <h3 className="font-heading text-xl font-bold">{t("photos.shotsTitle")}</h3>
          <dl className="grid gap-3 sm:grid-cols-2">
            {SHOTS.map((shot) => (
              <div key={shot} className="flex flex-col gap-1 rounded-3xl border border-border-subtle bg-surface-raised p-5">
                <dt className="font-heading text-lg font-bold">{tl(shot)}</dt>
                <dd className="text-base text-text-secondary">{t(`photos.shots.${shot}`)}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="flex flex-col gap-3 rounded-3xl bg-surface-brand-subtle p-5 sm:p-6">
          <h3 className="flex items-center gap-2 font-heading text-xl font-bold">
            <Icon icon={IconShieldCheck} className="size-6 text-icon-brand" />
            {t("photos.privacyTitle")}
          </h3>
          <ul className="flex list-disc flex-col gap-2 pl-6 text-base">
            {(t.raw("photos.privacy") as string[]).map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </PageRow>

      <PageRow id="setelah-mengirim" title={t("after.title")}>
        <ul className="flex list-disc flex-col gap-3 pl-6">
          {(t.raw("after.items") as string[]).map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </PageRow>
    </EduPage>
  );
}
