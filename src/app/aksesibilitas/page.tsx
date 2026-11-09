import type { Metadata } from "next";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { EduPage } from "@/components/edukasi/edu-page";
import { ROUTE } from "@/components/rute";
import type { Answer, Reason, Status } from "@/lib/api";
import { Icon } from "@/ui/icon";
import { ANSWER_ICON, ANSWER_TONE } from "@/ui/place-icons";
import { PageRow } from "@/ui/page-row";
import { StatusBadge } from "@/ui/status-badge";

const ANSWERS: Answer[] = ["tersedia", "tidak_tersedia", "tidak_perlu", "belum_tahu"];
const REASONS: Reason[] = ["tidak_ada", "rusak", "terhalang", "terbatas", "tidak_sesuai"];
// Urutan aturan status "pintu masuk dulu" (ADR-0018), bukan urutan status di legenda.
const RULES: Status[] = ["tidak_aksesibel", "belum_diketahui", "aksesibel", "sebagian"];

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Aksesibilitas");
  return { title: t("metaTitle") };
}

/**
 * Mengenal aksesibilitas (FR-51, ADR-0041): arti aksesibilitas, empat fasilitas, empat jawaban dan alasannya, dan
 * aturan status. Isinya menjelaskan ADR-0017, ADR-0018, dan ADR-0022, jadi ikut diperbarui bila ADR itu berubah.
 */
export default async function Aksesibilitas() {
  const [t, tf, tj, ta] = await Promise.all([
    getTranslations("Aksesibilitas"),
    getTranslations("Fasilitas"),
    getTranslations("Jawaban"),
    getTranslations("Alasan"),
  ]);
  return (
    <EduPage namespace="Aksesibilitas">
      <PageRow id="arti" title={t("meaning.title")}>
        {(t.raw("meaning.paragraphs") as string[]).map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </PageRow>

      <PageRow id="fasilitas" title={t("facilities.title")}>
        <p>{t("facilities.intro")}</p>
        <ul className="grid gap-4 sm:grid-cols-2">
          {ROUTE.map(({ facility, image }) => (
            <li key={facility} className="flex flex-col overflow-hidden rounded-3xl border border-border-subtle bg-surface-raised">
              <Image src={image} alt="" placeholder="blur" sizes="(min-width: 40rem) 20rem, 100vw" className="aspect-[2/1] w-full object-cover" />
              <div className="flex flex-col gap-2 p-5 text-base">
                <h3 className="font-heading text-xl font-bold">{tf(facility)}</h3>
                <p>{t(`facilities.items.${facility}.what`)}</p>
                <p className="text-text-secondary">
                  <span className="font-semibold text-text-primary">{t("facilities.whoLabel")}</span> {t(`facilities.items.${facility}.who`)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </PageRow>

      <PageRow id="jawaban" title={t("answers.title")}>
        <p>{t("answers.intro")}</p>
        <dl className="flex flex-col gap-4">
          {ANSWERS.map((answer) => (
            <div key={answer} className="flex flex-col gap-1 sm:flex-row sm:gap-4">
              <dt className="shrink-0 sm:w-44">
                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-sm font-bold ${ANSWER_TONE[answer]}`}>
                  <Icon icon={ANSWER_ICON[answer]} className="size-4" />
                  {tj(answer)}
                </span>
              </dt>
              <dd className="text-text-secondary">{t(`answers.items.${answer}`)}</dd>
            </div>
          ))}
        </dl>
      </PageRow>

      <PageRow id="bisa-dipakai" title={t("usable.title")}>
        <p>{t("usable.intro")}</p>
        <div className="rounded-3xl bg-bg-sunken p-5">
          <h3 className="lbl mb-3">{t("usable.reasonsLabel")}</h3>
          <dl className="flex flex-col gap-3 text-base">
            {REASONS.map((reason) => (
              <div key={reason}>
                <dt className="inline font-semibold">{ta(reason)}:</dt> <dd className="inline">{t(`usable.reasons.${reason}`)}</dd>
              </div>
            ))}
          </dl>
        </div>
        <p>{t("usable.note")}</p>
      </PageRow>

      <PageRow id="status" title={t("status.title")}>
        <p>{t("status.intro")}</p>
        <div className="flex flex-col gap-3">
          <h3 className="font-heading text-xl font-bold">{t("status.rulesTitle")}</h3>
          <p className="text-text-secondary">{t("status.rulesHint")}</p>
          <ol className="flex flex-col gap-3">
            {RULES.map((status, index) => (
              <li key={status} className="grid grid-cols-[auto_minmax(0,1fr)] gap-4 rounded-3xl border border-border-subtle bg-surface-raised p-4 sm:p-5">
                <span aria-hidden="true" className="grid size-11 place-items-center rounded-full bg-surface-brand-subtle font-mono text-base font-medium text-text-brand">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div className="flex flex-col items-start gap-2 text-base">
                  <StatusBadge status={status} size="sm" />
                  <p>{t(`status.rules.${status}`)}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
        <p>{t("status.relevant")}</p>
        <p>{t("status.summary")}</p>
        <p className="font-semibold">{t("status.unknown")}</p>
      </PageRow>

      <PageRow id="batas" title={t("limits.title")}>
        <ul className="flex list-disc flex-col gap-2 pl-6">
          {(t.raw("limits.items") as string[]).map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </PageRow>
    </EduPage>
  );
}
