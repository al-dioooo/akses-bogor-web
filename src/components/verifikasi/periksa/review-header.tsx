import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import type { Review } from "@/lib/verifikasi";
import { daysWaiting } from "@/lib/verifikator";
import { Icon } from "@/ui/icon";
import { IconArrowLeft } from "@/ui/icons";
import { CATEGORY_ICON } from "@/ui/place-icons";

/** Kepala halaman pemeriksaan: jenis laporan, nama, dan kapan dikirim. Pelapor hanya disebut nama tampilannya (FR-37). */
export async function ReviewHeader({ review, now }: { review: Review; now: Date }) {
  const [t, tk, tl, format] = await Promise.all([getTranslations("Pemeriksaan"), getTranslations("Kategori"), getTranslations("LaporanSaya"), getFormatter()]);
  const { submission: s } = review;
  return (
    <header className="flex flex-col items-start gap-4">
      <Link href={review.status === "klarifikasi" ? "/verifikasi/jawaban" : "/verifikasi"} className="inline-flex min-h-11 items-center gap-2 font-semibold underline-offset-2 hover:underline">
        <Icon icon={IconArrowLeft} className="size-5" />
        {t("back")}
      </Link>
      <p className="lbl flex flex-wrap items-center gap-2">
        <span>{t(`kind.${review.kind}`)}</span>
        <span aria-hidden="true">·</span>
        <span className="inline-flex items-center gap-1">
          <Icon icon={CATEGORY_ICON[s.category]} className="size-4" />
          {tk(s.category)}
        </span>
        <span aria-hidden="true">·</span>
        <span>{s.district.name}</span>
      </p>
      <h1 className="display text-[clamp(2.25rem,1.4rem+2.6vw,3.75rem)] leading-none break-words">{s.name}</h1>
      <p className="flex flex-wrap gap-x-4 gap-y-1 text-text-secondary">
        <span>{t("meta.submitted", { date: format.dateTime(new Date(review.submittedAt), { dateStyle: "long" }) })}</span>
        {(review.status === "menunggu" || review.status === "klarifikasi") && <span>{t("meta.waiting", { days: daysWaiting(review.submittedAt, now) })}</span>}
        <span>{review.reporterName ? t("meta.reporter", { name: review.reporterName }) : t("meta.reporterDeleted")}</span>
      </p>
      {review.status === "diterbitkan" && (
        <p role="status" className="rounded-2xl bg-status-accessible-bg p-4 font-semibold text-status-accessible-fg">
          {t("decided.diterbitkan")}{" "}
          <Link href={`/lokasi/${review.place?.id}`} className="underline underline-offset-2">
            {t("decided.viewPlace")}
          </Link>
        </p>
      )}
      {review.status === "ditolak" && review.rejectionReason && (
        <p role="status" className="rounded-2xl bg-status-inaccessible-bg p-4 font-semibold text-status-inaccessible-fg">
          {t("decided.ditolak", { reason: tl(`reason.${review.rejectionReason}.label`) })}
        </p>
      )}
    </header>
  );
}
