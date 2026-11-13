import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import type { MyReport, ReportStatus } from "@/lib/akun";
import { buttonClass } from "@/ui/button-styles";
import { Icon } from "@/ui/icon";
import { IconArrowRight, IconCircleCheck, IconCirclePlus, IconCircleX, IconClock, IconHelpCircle, IconMessageReport, type Glyph } from "@/ui/icons";

// Status laporan selalu teks + ikon + warna (Frame Akun, ADR-0027).
const STATUS: Record<ReportStatus, { icon: Glyph; tone: string }> = {
  menunggu: { icon: IconClock, tone: "bg-status-unknown-bg text-status-unknown-fg" },
  klarifikasi: { icon: IconHelpCircle, tone: "bg-status-partial-bg text-status-partial-fg" },
  diterbitkan: { icon: IconCircleCheck, tone: "bg-status-accessible-bg text-status-accessible-fg" },
  ditolak: { icon: IconCircleX, tone: "bg-status-inaccessible-bg text-status-inaccessible-fg" },
};

export async function ReportStatusBadge({ status }: { status: ReportStatus }) {
  const t = await getTranslations("LaporanSaya.status");
  const { icon, tone } = STATUS[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-bold ${tone}`}>
      <Icon icon={icon} className="size-4.5" />
      {t(status)}
    </span>
  );
}

/** Laporan saya (FR-14): status setiap laporan, alasan penolakan, dan pertanyaan klarifikasi. */
export async function MyReports({ reports }: { reports: MyReport[] }) {
  const [t, format] = await Promise.all([getTranslations("LaporanSaya"), getFormatter()]);
  const date = (value: string) => format.dateTime(new Date(value), { dateStyle: "long" });

  if (reports.length === 0) {
    return (
      <div className="flex flex-col items-start gap-4 rounded-3xl bg-bg-sunken p-6 sm:p-8">
        <span className="grid size-12 place-items-center rounded-2xl bg-surface-raised text-icon-brand">
          <Icon icon={IconMessageReport} className="size-6" />
        </span>
        <h3 className="font-heading text-xl font-bold">{t("emptyTitle")}</h3>
        <p className="max-w-prose text-text-secondary">{t("emptyBody")}</p>
        <Link href="/laporkan" className={buttonClass("primary", "md")}>
          <Icon icon={IconCirclePlus} />
          {t("emptyAction")}
        </Link>
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {reports.map((report) => (
        <li key={report.id} className="panel flex flex-col gap-3 rounded-3xl p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex min-w-0 flex-col gap-1">
              <h3 className="font-heading text-lg font-bold break-words">{report.placeName ?? t("unnamed")}</h3>
              <p className="text-sm text-text-secondary">
                {t(`kind.${report.kind}`)} · {t("submitted", { date: date(report.submittedAt) })}
              </p>
            </div>
            <ReportStatusBadge status={report.status} />
          </div>
          {report.status === "ditolak" && report.rejectionReason && (
            <div className="rounded-2xl bg-bg-sunken p-4">
              <p className="font-semibold">{t("reasonLabel", { reason: t(`reason.${report.rejectionReason}.label`) })}</p>
              <p className="text-text-secondary">{t(`reason.${report.rejectionReason}.message`)}</p>
            </div>
          )}
          {report.status === "klarifikasi" && report.clarificationQuestion && (
            <div className="flex flex-col rounded-2xl bg-bg-sunken p-4">
              <p className="font-semibold">{t("questionLabel")}</p>
              <p>{report.clarificationQuestion}</p>
              {report.clarificationDueAt && <p className="text-text-secondary">{t("questionDue", { date: date(report.clarificationDueAt) })}</p>}
              <Link href={`/akun/laporan/${report.id}`} className={buttonClass("primary", "sm", "mt-3 self-start")}>
                {t("answer")}
                <Icon icon={IconArrowRight} />
              </Link>
            </div>
          )}
          {report.status === "diterbitkan" && report.placeId && (
            <Link href={`/lokasi/${report.placeId}`} className={buttonClass("ghost", "sm", "self-start")}>
              {t("viewPlace")}
              <Icon icon={IconArrowRight} />
            </Link>
          )}
        </li>
      ))}
    </ul>
  );
}
