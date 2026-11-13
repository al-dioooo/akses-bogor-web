import type { Metadata } from "next";
import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { ReportStatusBadge } from "@/components/akun/my-reports";
import { getMyReports } from "@/lib/akun";
import { requireAccount } from "@/lib/sesi";
import { buttonClass } from "@/ui/button-styles";
import { Icon } from "@/ui/icon";
import { IconCircleCheck, IconCirclePlus, IconList } from "@/ui/icons";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Laporkan.terkirim");
  return { title: t("metaTitle") };
}

/** Laporan Berhasil (FR-26): konfirmasi, laporan yang baru masuk beserta statusnya, dan langkah selanjutnya. */
export default async function Terkirim({ searchParams }: PageProps<"/laporkan/terkirim">) {
  const t = await getTranslations("Laporkan.terkirim");
  const next = t.raw("next") as string[];
  return (
    <main id="konten" className="page-width flex flex-1 flex-col items-center py-10 sm:py-16">
      <div className="flex w-full max-w-2xl flex-col gap-8">
        <div className="flex flex-col items-start gap-4">
          <span className="grid size-14 place-items-center rounded-2xl bg-status-accessible-bg text-status-accessible-fg">
            <Icon icon={IconCircleCheck} className="size-8" />
          </span>
          <p className="lbl">{t("eyebrow")}</p>
          <h1 className="display text-[clamp(2.25rem,1.6rem+2.4vw,3.25rem)] leading-none">
            {t("title")}
            <span className="accent"> {t("accent")}</span>
          </h1>
          <p className="text-lg text-text-secondary">{t("intro")}</p>
        </div>

        <Suspense fallback={<p role="status">{t("loading")}</p>}>
          <Sent searchParams={searchParams} />
        </Suspense>

        <section aria-labelledby="selanjutnya" className="panel flex flex-col gap-4 rounded-3xl p-5 sm:p-7">
          <h2 id="selanjutnya" className="font-heading text-xl font-bold">
            {t("nextTitle")}
          </h2>
          <ol className="flex flex-col gap-3">
            {next.map((item, index) => (
              <li key={item} className="flex gap-3">
                <span aria-hidden="true" className="grid size-8 shrink-0 place-items-center rounded-full bg-bg-sunken font-mono text-sm font-semibold">
                  {index + 1}
                </span>
                <span className="pt-1">{item}</span>
              </li>
            ))}
          </ol>
        </section>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Link href="/akun" className={buttonClass("primary", "md")}>
            <Icon icon={IconList} />
            {t("mine")}
          </Link>
          <Link href="/laporkan" className={buttonClass("outline", "md")}>
            <Icon icon={IconCirclePlus} />
            {t("another")}
          </Link>
        </div>
      </div>
    </main>
  );
}

/** Laporan yang baru dikirim, dibaca dari Laporan saya; tidak tampil bila tidak ditemukan. */
async function Sent({ searchParams }: { searchParams: PageProps<"/laporkan/terkirim">["searchParams"] }) {
  const { laporan } = await searchParams;
  const { token } = await requireAccount(`/laporkan/terkirim${typeof laporan === "string" ? `?laporan=${encodeURIComponent(laporan)}` : ""}`);
  const [t, tl, format] = await Promise.all([getTranslations("Laporkan.terkirim"), getTranslations("LaporanSaya"), getFormatter()]);
  const report = typeof laporan === "string" ? (await getMyReports(token).catch(() => ({ items: [] }))).items.find((item) => item.id === laporan) : undefined;
  if (!report) return null;
  return (
    <div className="flex flex-col items-start gap-2 rounded-3xl bg-bg-sunken p-5">
      <p className="text-sm font-semibold text-text-secondary">{tl(`kind.${report.kind}`)}</p>
      <p className="font-heading text-xl font-bold">{report.placeName ?? tl("unnamed")}</p>
      <ReportStatusBadge status={report.status} />
      <p className="text-sm text-text-secondary">{t("submitted", { date: format.dateTime(new Date(report.submittedAt), { dateStyle: "long", timeStyle: "short" }) })}</p>
    </div>
  );
}
