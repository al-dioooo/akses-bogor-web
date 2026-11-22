import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { MyReports } from "@/components/akun/my-reports";
import { DashboardHeading } from "@/components/dasbor/dashboard-heading";
import { myReports } from "@/components/dasbor/ringkasan/data";
import { REPORT_STATUSES, type ReportStatus } from "@/lib/akun";
import { countByStatus } from "@/lib/dasbor";
import { requireAccount } from "@/lib/sesi";
import { LoadErrorBoundary } from "@/ui/load-error";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("LaporanSaya");
  return { title: t("title") };
}

/** Laporan saya (FR-14): semua laporan dengan statusnya, bisa disaring per status dari Ringkasan (ADR-0046). */
export default async function LaporanSaya({ searchParams }: PageProps<"/akun/laporan">) {
  const t = await getTranslations("LaporanSaya");
  return (
    <>
      <DashboardHeading id="judul-laporan" label={t("eyebrow")} title={t("heading")} accent={t("accent")} intro={t("intro")} />
      <LoadErrorBoundary>
        <Suspense fallback={<p role="status">{t("loading")}</p>}>
          <Reports searchParams={searchParams} />
        </Suspense>
      </LoadErrorBoundary>
    </>
  );
}

async function Reports({ searchParams }: { searchParams: PageProps<"/akun/laporan">["searchParams"] }) {
  const { status } = await searchParams;
  const selected = REPORT_STATUSES.find((value) => value === status) ?? null;
  const { token } = await requireAccount(selected ? `/akun/laporan?status=${selected}` : "/akun/laporan");
  const [t, { items }] = await Promise.all([getTranslations("LaporanSaya"), myReports(token)]);
  const counts = countByStatus(items);
  const shown = selected ? items.filter((report) => report.status === selected) : items;
  const filters: { status: ReportStatus | null; label: string; count: number }[] = [
    { status: null, label: t("filter.all"), count: items.length },
    ...REPORT_STATUSES.map((value) => ({ status: value, label: t(`status.${value}`), count: counts[value] })),
  ];
  return (
    <>
      {items.length > 0 && <nav aria-label={t("filter.label")}>
        <ul className="flex flex-wrap gap-2">
          {filters.map((filter) => {
            const current = filter.status === selected;
            return (
              <li key={filter.status ?? "semua"}>
                <Link
                  href={filter.status ? `/akun/laporan?status=${filter.status}` : "/akun/laporan"}
                  aria-current={current ? "page" : undefined}
                  className={`inline-flex min-h-11 items-center gap-2 rounded-full border-2 px-4 font-semibold transition-colors ${
                    current ? "border-border-strong bg-text-primary text-bg-canvas" : "border-border-subtle hover:border-border-strong"
                  }`}
                >
                  {filter.label}
                  <span className={`rounded-full px-2 text-sm tabular-nums ${current ? "bg-bg-canvas/20" : "bg-bg-sunken"}`}>{filter.count}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>}
      {/* Wilayah dinamai judul halaman; h2 menyebut berapa laporan yang tampil. */}
      <section aria-labelledby="judul-laporan" className="flex flex-col gap-4">
        <h2 className="font-heading text-xl font-bold">{t("shown", { count: shown.length })}</h2>
        {shown.length === 0 && selected ? <p className="rounded-2xl bg-bg-sunken p-5">{t("filter.empty")}</p> : <MyReports reports={shown} />}
      </section>
    </>
  );
}
