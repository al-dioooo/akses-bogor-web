import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import { MyReports, REPORT_STATUS, ReportStatusBadge } from "@/components/akun/my-reports";
import type { ReportStatus } from "@/lib/akun";
import { countByStatus } from "@/lib/dasbor";
import { Icon } from "@/ui/icon";
import { myReports } from "./data";
import { SectionTitle } from "./section";

/** Urutan di pita angka: yang sudah tayang dulu, lalu yang masih berjalan. */
const ORDER: ReportStatus[] = ["diterbitkan", "menunggu", "klarifikasi", "ditolak"];
const RECENT = 3;
/** `GET /me/reports` memuat paling banyak 100 laporan terbaru. */
const API_LIMIT = 100;

/**
 * Laporan saya di Ringkasan: pita gelap dengan jumlah per status (pola pita angka ADR-0027), setiap angka menuju Laporan
 * saya yang tersaring, lalu tiga laporan terbaru.
 */
export async function ReportSummary({ token }: { token: string }) {
  const [t, tl, format, { items }] = await Promise.all([
    getTranslations("Dasbor.ringkasan.reports"),
    getTranslations("LaporanSaya"),
    getFormatter(),
    myReports(token),
  ]);
  const counts = countByStatus(items);
  return (
    <section aria-labelledby="ringkasan-laporan" className="flex flex-col gap-4">
      <SectionTitle id="ringkasan-laporan" title={t("title")} action={items.length > 0 ? { href: "/akun/laporan", label: t("all") } : undefined} />
      {items.length === 0 ? (
        <MyReports reports={[]} />
      ) : (
        <>
          <ul aria-label={t("counts")} className="grid grid-cols-2 gap-2 rounded-3xl bg-surface-inverse p-2 text-text-on-inverse sm:grid-cols-4">
            {ORDER.map((status) => (
              <li key={status} className="flex">
                <Link
                  href={`/akun/laporan?status=${status}`}
                  className="flex flex-1 flex-col gap-3 rounded-2xl p-4 transition-colors duration-200 hover:bg-text-on-inverse/10"
                >
                  <span className={`display text-5xl leading-none tabular-nums ${status === "diterbitkan" ? "text-text-highlight" : ""}`}>
                    {format.number(counts[status])}
                  </span>
                  <span className="flex items-center gap-1.5 text-sm font-semibold text-text-on-inverse-secondary">
                    <Icon icon={REPORT_STATUS[status].icon} className="size-4.5" />
                    {tl(`status.${status}`)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <h3 className="lbl pt-2">{t("recent")}</h3>
          <ul className="flex flex-col gap-2">
            {items.slice(0, RECENT).map((report) => (
              <li key={report.id} className="panel flex flex-wrap items-center justify-between gap-3 rounded-2xl p-4">
                <span className="flex min-w-0 flex-col">
                  <span className="font-heading font-bold break-words">{report.placeName ?? tl("unnamed")}</span>
                  <span className="text-sm text-text-secondary">
                    {tl(`kind.${report.kind}`)} · {tl("submitted", { date: format.dateTime(new Date(report.submittedAt), { dateStyle: "medium" }) })}
                  </span>
                </span>
                <ReportStatusBadge status={report.status} />
              </li>
            ))}
          </ul>
          {items.length >= API_LIMIT && <p className="text-sm text-text-secondary">{t("limit")}</p>}
        </>
      )}
    </section>
  );
}
